import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import { MongoClient, ServerApiVersion, ObjectId, Collection, Db } from "mongodb";
import { createRemoteJWKSet, jwtVerify } from "jose-cjs";
dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());
const uri = process.env.MONGODB_URI || "";
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    },
});
// ===== Global Collection Variables =====
let booksCollection;
let usersCollection;
let borrowRequestsCollection;
// ===== JWT Middleware =====
const JWKS = createRemoteJWKSet(new URL(`${process.env.CLIENT_URL}/api/auth/jwks`));
const verifyToken = async (req, res, next) => {
    const authHeader = req?.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ message: "Unauthorized" });
    }
    const token = authHeader.split(" ")[1];
    if (!token) {
        return res.status(401).json({ message: "Unauthorized" });
    }
    try {
        const { payload } = await jwtVerify(token, JWKS);
        req.user = payload;
        next();
    }
    catch (error) {
        return res.status(403).json({ message: "Forbidden" });
    }
};
// ===== MongoDB Connect & Route Setup =====
async function run() {
    try {
        await client.connect();
        const db = client.db("booknest");
        // Assign collections
        booksCollection = db.collection("books");
        usersCollection = db.collection("user");
        borrowRequestsCollection = db.collection("borrowRequest");
        // ===== Routes =====
        app.get("/", (req, res) => {
            res.send("booknest Server Running");
        });
        app.get("/books", async (req, res) => {
            const books = await booksCollection.find({}).toArray();
            res.json(books);
        });
        app.get("/books/:id", async (req, res) => {
            const id = req.params.id;
            if (!ObjectId.isValid(id)) {
                return res.status(400).json({ message: "Invalid Book ID format" });
            }
            const book = await booksCollection.findOne({ _id: new ObjectId(id) });
            res.json(book);
        });
        app.get("/users/:id", async (req, res) => {
            try {
                const id = req.params.id;
                if (!ObjectId.isValid(id)) {
                    return res.status(400).json({ message: "Invalid User ID format" });
                }
                const singleUser = await usersCollection.findOne({ _id: new ObjectId(id) });
                if (!singleUser) {
                    return res.status(404).json({ message: "User not found" });
                }
                res.status(200).json(singleUser);
            }
            catch (error) {
                res.status(500).json({ message: "Internal server error", error: error.message });
            }
        });
        app.post("/books/:id/request", verifyToken, async (req, res) => {
            try {
                const id = req.params.id;
                const borrower = req.body;
                if (!ObjectId.isValid(id)) {
                    return res.status(400).json({ message: "Invalid Book ID" });
                }
                const book = await booksCollection.findOne({ _id: new ObjectId(id) });
                if (!book) {
                    return res.status(404).json({ message: "Book not found" });
                }
                if (book.ownerEmail === borrower.email) {
                    return res.status(400).json({ message: "You can't borrow your own book." });
                }
                const alreadyRequested = await borrowRequestsCollection.findOne({
                    bookId: id,
                    borrowerEmail: borrower.email,
                    status: "pending",
                });
                if (alreadyRequested) {
                    return res.status(400).json({ message: "You already requested this book." });
                }
                const request = {
                    bookId: id,
                    bookTitle: book.title,
                    ownerEmail: book.ownerEmail || "",
                    borrowerName: borrower.name,
                    borrowerEmail: borrower.email,
                    status: "pending",
                    requestDate: new Date(),
                };
                const result = await borrowRequestsCollection.insertOne(request);
                res.status(201).json({ success: true, insertedId: result.insertedId });
            }
            catch (error) {
                console.log(error);
                res.status(500).json({ message: "Internal Server Error" });
            }
        });
        app.post("/books", verifyToken, async (req, res) => {
            try {
                const userId = req.user?.id;
                const { title, author, description, category, type, coverImage, pdfUrl, pickupLocation } = req.body;
                const newBook = {
                    title,
                    author,
                    description: description || "",
                    category,
                    type,
                    coverImage: coverImage || "",
                    pdfUrl: type === "PDF" ? pdfUrl : "",
                    pickupLocation: type === "Physical" ? pickupLocation : "",
                    status: "Available",
                    ownerId: userId,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                };
                const result = await booksCollection.insertOne(newBook);
                res.status(201).json({ success: true, message: "Book shared!", bookId: result.insertedId });
            }
            catch (error) {
                console.error("❌ Error in /books:", error);
                res.status(500).json({ error: error.message });
            }
        });
        app.get("/dashboard/books", verifyToken, async (req, res) => {
            try {
                const userId = req.user?.id || req.user?._id;
                if (!userId) {
                    return res.status(401).json({ error: "Unauthorized: User ID not found in token." });
                }
                const sharedBooksCount = await booksCollection.countDocuments({ ownerId: userId });
                return res.status(200).json({
                    success: true,
                    userId,
                    sharedBooksCount,
                });
            }
            catch (error) {
                console.error("Error counting shared books:", error);
                return res.status(500).json({ error: "Internal server error" });
            }
        });
        app.get("/dashboard/borrowRequests/email", verifyToken, async (req, res) => {
            try {
                const userEmail = req.user?.email;
                if (!userEmail) {
                    return res.status(401).json({ error: "Unauthorized: Email not found in token." });
                }
                const borrowRequests = await borrowRequestsCollection
                    .find({ borrowerEmail: userEmail })
                    .sort({ createdAt: -1 })
                    .toArray();
                const borrowedBooksCount = borrowRequests.filter((item) => item.status?.toLowerCase() === "approved").length;
                const pendingRequestsCount = borrowRequests.filter((req) => req.status?.toLowerCase() === "pending").length;
                return res.status(200).json({
                    success: true,
                    stats: {
                        borrowedBooksCount,
                        pendingRequestsCount,
                    },
                    borrowRequests,
                });
            }
            catch (error) {
                console.error("Error fetching borrow requests:", error);
                return res.status(500).json({ error: "Internal server error" });
            }
        });
        app.get("/dashboard/shared-books/:userId", async (req, res) => {
            try {
                const { userId } = req.params;
                if (!userId) {
                    return res.status(400).json({ message: "User ID is required" });
                }
                let queryConditions = [{ ownerId: userId }];
                if (ObjectId.isValid(userId)) {
                    queryConditions.push({ ownerId: new ObjectId(userId) });
                }
                const sharedBooks = await booksCollection
                    .find({ $or: queryConditions })
                    .toArray();
                return res.status(200).json(sharedBooks);
            }
            catch (error) {
                console.error("Error fetching shared books:", error);
                return res.status(500).json({ message: "Internal server error" });
            }
        });
        app.get("/dashboard/borrowRequests/:email", async (req, res) => {
            try {
                const { email } = req.params;
                if (!email) {
                    return res.status(400).json({ message: "Email is required" });
                }
                const borrowRequests = await borrowRequestsCollection
                    .find({
                    borrowerEmail: email,
                    status: "pending",
                })
                    .sort({ createdAt: -1 })
                    .toArray();
                return res.status(200).json(borrowRequests);
            }
            catch (error) {
                console.error("Error fetching borrow requests:", error);
                return res.status(500).json({ message: "Internal server error" });
            }
        });
        app.delete("/dashboard/borrowRequests/:id", async (req, res) => {
            try {
                const id = req.params.id;
                if (!borrowRequestsCollection) {
                    return res.status(500).json({ error: "Database collection is not initialized." });
                }
                if (!ObjectId.isValid(id)) {
                    return res.status(400).json({ error: "Invalid ID format" });
                }
                const query = { _id: new ObjectId(id) };
                const result = await borrowRequestsCollection.deleteOne(query);
                if (result.deletedCount === 0) {
                    return res.status(404).json({ error: "Borrow request not found" });
                }
                res.status(200).json({
                    message: "Borrow request deleted successfully",
                    deletedCount: result.deletedCount,
                });
            }
            catch (error) {
                res.status(500).json({ error: error.message });
            }
        });
        app.get("/borrow-requests", async (req, res) => {
            try {
                const result = await borrowRequestsCollection.find().toArray();
                return res.status(200).json(result);
            }
            catch (error) {
                return res.status(500).json({ error: "Failed to fetch borrow requests." });
            }
        });
        app.delete("/books/:id", async (req, res) => {
            try {
                const id = req.params.id;
                if (!ObjectId.isValid(id)) {
                    return res.status(400).json({ message: "Invalid book ID format" });
                }
                const result = await booksCollection.deleteOne({ _id: new ObjectId(id) });
                if (result.deletedCount === 0) {
                    return res.status(404).json({ message: "Book not found" });
                }
                return res.status(200).json({ message: "Book deleted successfully" });
            }
            catch (error) {
                console.error("Error deleting book:", error);
                return res.status(500).json({ message: "Internal server error" });
            }
        });
        app.patch("/borrow-requests/:id", async (req, res) => {
            try {
                const id = req.params.id;
                console.log(req.body);
                const { status } = req.body;
                if (!ObjectId.isValid(id)) {
                    return res.status(400).json({ message: "Invalid request ID format." });
                }
                const allowedStatuses = ["Approved", "Rejected", "Pending"];
                if (!status || !allowedStatuses.includes(status)) {
                    return res.status(400).json({ message: "Invalid status value provided." });
                }
                const request = await borrowRequestsCollection.findOne({ _id: new ObjectId(id) });
                if (!request) {
                    return res.status(404).json({ message: "Borrow request not found." });
                }
                const filter = { _id: new ObjectId(id) };
                const updateDoc = {
                    $set: {
                        status: status,
                        updatedAt: new Date(),
                    },
                };
                const result = await borrowRequestsCollection.updateOne(filter, updateDoc);
                if (result.matchedCount === 0) {
                    return res.status(404).json({ message: "Borrow request not found." });
                }
                if (status === "Approved" && request.bookId) {
                    if (ObjectId.isValid(request.bookId)) {
                        await booksCollection.updateOne({ _id: new ObjectId(request.bookId) }, {
                            $set: {
                                status: "Borrowed",
                                updatedAt: new Date(),
                            },
                        });
                        console.log(`✅ Book ${request.bookId} status updated to Borrowed.`);
                    }
                    else {
                        console.warn(`⚠️ Invalid bookId format: ${request.bookId}`);
                    }
                }
                return res.status(200).json({
                    message: `Request status updated to ${status} successfully.`,
                });
            }
            catch (error) {
                console.error("Error updating status:", error);
                return res.status(500).json({ message: "Internal server error." });
            }
        });
        app.delete("/borrow-requests/:id", async (req, res) => {
            try {
                const id = req.params.id;
                if (!ObjectId.isValid(id)) {
                    return res.status(400).json({ message: "Invalid request ID format." });
                }
                const result = await borrowRequestsCollection.deleteOne({ _id: new ObjectId(id) });
                if (result.deletedCount === 0) {
                    return res.status(404).json({ message: "Borrow request not found." });
                }
                return res.status(200).json({ message: "Borrow request deleted successfully." });
            }
            catch (error) {
                console.error("Error deleting request:", error);
                return res.status(500).json({ message: "Internal server error." });
            }
        });
        app.get("/dashboard/books/borrowed/:email", async (req, res) => {
            try {
                const { email } = req.params;
                const approvedRequests = await borrowRequestsCollection
                    .find({
                    borrowerEmail: email,
                    status: "Approved",
                })
                    .toArray();
                const bookObjectIds = approvedRequests
                    .filter((req) => ObjectId.isValid(req.bookId))
                    .map((req) => new ObjectId(req.bookId));
                const books = await booksCollection
                    .find({ _id: { $in: bookObjectIds } })
                    .toArray();
                res.status(200).json(books);
            }
            catch (error) {
                res.status(500).json({ error: error.message });
            }
        });
        app.patch("/dashboard/books/return/:id", async (req, res) => {
            try {
                const id = req.params.id;
                if (!ObjectId.isValid(id)) {
                    return res.status(400).json({ error: "Invalid book ID" });
                }
                const result = await booksCollection.updateOne({ _id: new ObjectId(id) }, {
                    $set: {
                        status: "available",
                        borrowedBy: null,
                    },
                });
                if (result.matchedCount === 0) {
                    return res.status(404).json({ message: "Book not found" });
                }
                res.status(200).json({ success: true, message: "Book returned successfully" });
            }
            catch (error) {
                res.status(500).json({ error: error.message });
            }
        });
        // ===== Server Start =====
        const PORT = process.env.PORT || 5000;
        app.listen(PORT, () => {
            console.log(`Example app listening on port ${PORT}`);
        });
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    }
    catch (error) {
        console.error("❌ Failed to connect to MongoDB:", error);
    }
}
run().catch(console.dir);
//# sourceMappingURL=index.js.map