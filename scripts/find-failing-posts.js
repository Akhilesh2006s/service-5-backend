import mongoose from 'mongoose';
import Post from '../models/Post.js';
import dotenv from 'dotenv';

dotenv.config();

const findFailingPosts = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Get all posts and check manually
    const allPosts = await Post.find({});
    console.log(`Checking ${allPosts.length} posts for failing URLs...`);
    
    const failingUrls = [
      'files-1757928752454-33660079.png',
      'files-1757928783717-722410578.mp4'
    ];

    for (const post of allPosts) {
      let hasFailingUrl = false;
      let foundUrls = [];
      
      // Check images
      if (post.images && post.images.length > 0) {
        for (const img of post.images) {
          const imgUrl = typeof img === 'string' ? img : (img && img.url ? img.url : '');
          if (imgUrl) {
            for (const failingUrl of failingUrls) {
              if (imgUrl.includes(failingUrl)) {
                hasFailingUrl = true;
                foundUrls.push(`Image: ${imgUrl}`);
              }
            }
          }
        }
      }
      
      // Check videos
      if (post.videos && post.videos.length > 0) {
        for (const vid of post.videos) {
          const vidUrl = typeof vid === 'string' ? vid : (vid && vid.url ? vid.url : '');
          if (vidUrl) {
            for (const failingUrl of failingUrls) {
              if (vidUrl.includes(failingUrl)) {
                hasFailingUrl = true;
                foundUrls.push(`Video: ${vidUrl}`);
              }
            }
          }
        }
      }
      
      if (hasFailingUrl) {
        console.log(`\n❌ Post ${post._id}: ${post.title}`);
        console.log(`   Found failing URLs:`);
        foundUrls.forEach(url => console.log(`     ${url}`));
        console.log(`   Full images: ${JSON.stringify(post.images)}`);
        console.log(`   Full videos: ${JSON.stringify(post.videos)}`);
      }
    }

    console.log('\n✅ Search completed');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
};

findFailingPosts();
