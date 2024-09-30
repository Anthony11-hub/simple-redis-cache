import express, { Request, Response, NextFunction } from "express";
import axios from "axios";
import { createClient } from "redis";
import cors from "cors";

const app = express();
const EXPIRATION = 3600; // 1 hour cache expiration
app.use(cors());
app.use(
  express.urlencoded({
    extended: true,
  })
);

// Redis client setup
const redisClient = createClient({
  url: "redis://localhost:6379", // Adjust your Redis connection string if needed
});

redisClient.connect().catch((error) => {
  console.error("Error connecting to Redis:", error);
});

// Helper function to get or set cache
const getOrSetCache = async (key: string, cb: Function) => {
  try {
    const cachedData = await redisClient.get(key);
    if (cachedData) {
      return JSON.parse(cachedData);
    }

    const data = await cb();
    await redisClient.setEx(key, EXPIRATION, JSON.stringify(data)); // Ensure proper arguments here
    return data;
  } catch (error) {
    console.error(`Error getting or setting cache for ${key}:`, error);
    throw error;
  }
};

// Route to fetch photos
app.get("/photos", async (req: Request, res: Response, next: NextFunction) => {
  const { albumId } = req.query;

  try {
    // Try to get the cached data from Redis
    const photos = await getOrSetCache(`album_${albumId}`, async () => {
      const { data } = await axios.get(
        "https://jsonplaceholder.typicode.com/photos",
        { params: { albumId: albumId } }
      );
      return data;
    });

    res.json(photos);
  } catch (error) {
    console.error("Error fetching photos:", error);
    next(error);
  }
});

app.get(
  "/photos/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Try to get the cached data from Redis
      const photo = await getOrSetCache(`${req.params.id}`, async () => {
        const { data } = await axios.get(
          `https://jsonplaceholder.typicode.com/photos/${req.params.id}`
        );
        return data;
      });

      res.json(photo);
    } catch (error) {
      console.error("Error fetching photo:", error);
      next(error);
    }
  }
);

app.listen(3000, () => {
  console.log("Server running on port 3000");
});
