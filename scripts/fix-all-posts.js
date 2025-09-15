import mongoose from 'mongoose';
import Post from '../models/Post.js';
import dotenv from 'dotenv';

dotenv.config();

const fixAllPosts = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find all posts
    const posts = await Post.find({});
    console.log(`Found ${posts.length} posts to check`);

    for (const post of posts) {
      console.log(`\nChecking post ${post._id}: ${post.title}`);
      
      let needsUpdate = false;
      const updateData = {};

      // Fix images
      if (post.images && post.images.length > 0) {
        console.log('  Checking images...');
        const firstImage = post.images[0];
        
        if (typeof firstImage === 'object' && firstImage.hasOwnProperty('0')) {
          console.log('    Found corrupted image format, fixing...');
          const fixedImages = post.images.map(imgObj => {
            if (typeof imgObj === 'object' && imgObj.hasOwnProperty('0')) {
              // Convert corrupted object to string
              const url = Object.keys(imgObj)
                .filter(key => !isNaN(key))
                .sort((a, b) => parseInt(a) - parseInt(b))
                .map(key => imgObj[key])
                .join('');
              console.log(`      Reconstructed URL: ${url}`);
              return { url: url, base64Data: null };
            } else if (typeof imgObj === 'string') {
              // Convert string to new format
              return { url: imgObj, base64Data: null };
            } else if (typeof imgObj === 'object' && imgObj.url) {
              // Already in new format
              return imgObj;
            }
            return imgObj;
          });
          updateData.images = fixedImages;
          needsUpdate = true;
        } else if (typeof firstImage === 'string') {
          console.log('    Converting string images to new format...');
          updateData.images = post.images.map(url => ({ url: url, base64Data: null }));
          needsUpdate = true;
        }
      }

      // Fix videos
      if (post.videos && post.videos.length > 0) {
        console.log('  Checking videos...');
        const firstVideo = post.videos[0];
        
        if (typeof firstVideo === 'object' && firstVideo.hasOwnProperty('0')) {
          console.log('    Found corrupted video format, fixing...');
          const fixedVideos = post.videos.map(vidObj => {
            if (typeof vidObj === 'object' && vidObj.hasOwnProperty('0')) {
              // Convert corrupted object to string
              const url = Object.keys(vidObj)
                .filter(key => !isNaN(key))
                .sort((a, b) => parseInt(a) - parseInt(b))
                .map(key => vidObj[key])
                .join('');
              console.log(`      Reconstructed URL: ${url}`);
              return { url: url, base64Data: null };
            } else if (typeof vidObj === 'string') {
              // Convert string to new format
              return { url: vidObj, base64Data: null };
            } else if (typeof vidObj === 'object' && vidObj.url) {
              // Already in new format
              return vidObj;
            }
            return vidObj;
          });
          updateData.videos = fixedVideos;
          needsUpdate = true;
        } else if (typeof firstVideo === 'string') {
          console.log('    Converting string videos to new format...');
          updateData.videos = post.videos.map(url => ({ url: url, base64Data: null }));
          needsUpdate = true;
        }
      }

      if (needsUpdate) {
        await Post.findByIdAndUpdate(post._id, updateData);
        console.log(`  ✅ Updated post ${post._id}`);
      } else {
        console.log(`  ✅ Post ${post._id} is already in correct format`);
      }
    }

    console.log('\n✅ All posts processed successfully');
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
};

fixAllPosts();
