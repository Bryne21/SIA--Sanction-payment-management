const mongoose = require('mongoose');

// Define the Member schema matching the existing MongoDB collection documents.
// This schema is intentionally aligned to the current `Members` collection
// so Mongoose will use the existing collection instead of creating a new one.
const memberSchema = new mongoose.Schema(
  {
    studentId: { type: String, required: true, index: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    middleName: { type: String, required: false },
    yearLevel: { type: Number, required: true },
    course: { type: String, required: true },
    organizationId: { type: String, required: true },
    membershipFeeStatus: { type: String, required: true },
    membershipStatus: { type: String, required: true },
    dateRegistered: { type: Date, required: true }
  },
  {
    collection: 'Members', // Use the existing collection name exactly as it exists in MongoDB Atlas.
    timestamps: true // Automatically manage createdAt and updatedAt fields.
  }
);

// Export the model. If the model is already registered, reuse it to avoid overwrite issues.
module.exports = mongoose.models.Member || mongoose.model('Member', memberSchema);
