import mongoose from 'mongoose';
import Post from '../models/Post.js';
import dotenv from 'dotenv';

dotenv.config();

const fixCorruptedPosts = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find posts with corrupted image/video data
    const posts = await Post.find({
      $or: [
        { 'images.0.0': { $exists: true } }, // Check for corrupted image format
        { 'videos.0.0': { $exists: true } }  // Check for corrupted video format
      ]
    });

    console.log(`Found ${posts.length} corrupted posts to fix`);

    for (const post of posts) {
      console.log(`\nFixing post ${post._id}: ${post.title}`);
      
      let needsUpdate = false;
      const updateData = {};

      // Fix corrupted images
      if (post.images && post.images.length > 0 && post.images[0].hasOwnProperty('0')) {
        console.log('  Fixing corrupted images...');
        const fixedImages = post.images.map(imgObj => {
          // Convert the corrupted object back to a string
          const url = Object.keys(imgObj)
            .filter(key => !isNaN(key)) // Only numeric keys
            .sort((a, b) => parseInt(a) - parseInt(b)) // Sort by index
            .map(key => imgObj[key])
            .join('');
          
          console.log(`    Reconstructed URL: ${url}`);
          
          // Return in new format
          return {
            url: url,
            base64Data: null // Will be populated when files are re-uploaded
          };
        });
        
        updateData.images = fixedImages;
        needsUpdate = true;
      }

      // Fix corrupted videos
      if (post.videos && post.videos.length > 0 && post.videos[0].hasOwnProperty('0')) {
        console.log('  Fixing corrupted videos...');
        const fixedVideos = post.videos.map(vidObj => {
          // Convert the corrupted object back to a string
          const url = Object.keys(vidObj)
            .filter(key => !isNaN(key)) // Only numeric keys
            .sort((a, b) => parseInt(a) - parseInt(b)) // Sort by index
            .map(key => vidObj[key])
            .join('');
          
          console.log(`    Reconstructed URL: ${url}`);
          
          // Return in new format
          return {
            url: url,
            base64Data: null // Will be populated when files are re-uploaded
          };
        });
        
        updateData.videos = fixedVideos;
        needsUpdate = true;
      }

      if (needsUpdate) {
        await Post.findByIdAndUpdate(post._id, updateData);
        console.log(`  ✅ Updated post ${post._id}`);
      }
    }

    console.log('\n✅ Migration completed successfully');
  } catch (error) {
    console.error('❌ Migration error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
};

fixCorruptedPosts();
