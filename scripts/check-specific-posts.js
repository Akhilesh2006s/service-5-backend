import mongoose from 'mongoose';
import Post from '../models/Post.js';
import dotenv from 'dotenv';

dotenv.config();

const checkSpecificPosts = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find posts with the specific failing URLs
    const failingUrls = [
      'files-1757928752454-33660079.png',
      'files-1757928783717-722410578.mp4'
    ];

    for (const urlFragment of failingUrls) {
      console.log(`\nSearching for posts with URL containing: ${urlFragment}`);
      
      const posts = await Post.find({
        $or: [
          { 'images.url': { $regex: urlFragment } },
          { 'videos.url': { $regex: urlFragment } },
          { 'images': { $regex: urlFragment } },
          { 'videos': { $regex: urlFragment } }
        ]
      });

      console.log(`Found ${posts.length} posts with this URL fragment`);

      for (const post of posts) {
        console.log(`\nPost ${post._id}: ${post.title}`);
        console.log(`  Images: ${JSON.stringify(post.images, null, 2)}`);
        console.log(`  Videos: ${JSON.stringify(post.videos, null, 2)}`);
      }
    }

    // Also check all posts for any that might have these URLs
    console.log('\n\nChecking all posts for the failing URLs...');
    const allPosts = await Post.find({});
    
    for (const post of allPosts) {
      let hasFailingUrl = false;
      
      if (post.images && post.images.length > 0) {
        for (const img of post.images) {
          const imgUrl = typeof img === 'string' ? img : img.url;
          if (imgUrl && (imgUrl.includes('files-1757928752454-33660079.png') || imgUrl.includes('files-1757928783717-722410578.mp4'))) {
            hasFailingUrl = true;
            console.log(`\nFound failing URL in post ${post._id}: ${imgUrl}`);
          }
        }
      }
      
      if (post.videos && post.videos.length > 0) {
        for (const vid of post.videos) {
          const vidUrl = typeof vid === 'string' ? vid : vid.url;
          if (vidUrl && (vidUrl.includes('files-1757928752454-33660079.png') || vidUrl.includes('files-1757928783717-722410578.mp4'))) {
            hasFailingUrl = true;
            console.log(`\nFound failing URL in post ${post._id}: ${vidUrl}`);
          }
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

checkSpecificPosts();
