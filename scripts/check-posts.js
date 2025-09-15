import mongoose from 'mongoose';
import Post from '../models/Post.js';
import dotenv from 'dotenv';

dotenv.config();

const checkPosts = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find all posts
    const posts = await Post.find({}).limit(10);
    console.log(`Found ${posts.length} posts`);

    for (const post of posts) {
      console.log(`\nPost ${post._id}:`);
      console.log(`  Title: ${post.title}`);
      console.log(`  Images: ${JSON.stringify(post.images)}`);
      console.log(`  Videos: ${JSON.stringify(post.videos)}`);
      
      // Check if images/videos are in old format (strings) or new format (objects)
      if (post.images && post.images.length > 0) {
        const firstImage = post.images[0];
        console.log(`  First image type: ${typeof firstImage}`);
        if (typeof firstImage === 'string') {
          console.log(`  Old format image URL: ${firstImage}`);
        } else if (typeof firstImage === 'object') {
          console.log(`  New format image: url=${firstImage.url}, hasBase64=${!!firstImage.base64Data}`);
        }
      }
      
      if (post.videos && post.videos.length > 0) {
        const firstVideo = post.videos[0];
        console.log(`  First video type: ${typeof firstVideo}`);
        if (typeof firstVideo === 'string') {
          console.log(`  Old format video URL: ${firstVideo}`);
        } else if (typeof firstVideo === 'object') {
          console.log(`  New format video: url=${firstVideo.url}, hasBase64=${!!firstVideo.base64Data}`);
        }
      }
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
};

checkPosts();
