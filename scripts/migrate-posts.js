import mongoose from 'mongoose';
import Post from '../models/Post.js';
import dotenv from 'dotenv';

dotenv.config();

const migratePosts = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find all posts with old format images/videos
    const posts = await Post.find({
      $or: [
        { 'images.0': { $type: 'string' } },
        { 'videos.0': { $type: 'string' } }
      ]
    });

    console.log(`Found ${posts.length} posts to migrate`);

    for (const post of posts) {
      let needsUpdate = false;
      const updateData = {};

      // Migrate images
      if (post.images && post.images.length > 0 && typeof post.images[0] === 'string') {
        updateData.images = post.images.map(url => ({
          url: url,
          base64Data: null // Will be populated when files are re-uploaded
        }));
        needsUpdate = true;
        console.log(`Migrating images for post ${post._id}:`, post.images);
      }

      // Migrate videos
      if (post.videos && post.videos.length > 0 && typeof post.videos[0] === 'string') {
        updateData.videos = post.videos.map(url => ({
          url: url,
          base64Data: null // Will be populated when files are re-uploaded
        }));
        needsUpdate = true;
        console.log(`Migrating videos for post ${post._id}:`, post.videos);
      }

      if (needsUpdate) {
        await Post.findByIdAndUpdate(post._id, updateData);
        console.log(`Updated post ${post._id}`);
      }
    }

    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
};

migratePosts();
