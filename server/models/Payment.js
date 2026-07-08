const mongoose = require('mongoose');

// Define the Payment schema for the existing `payments` collection.
// This does not create a new collection; it explicitly uses the existing one.
const paymentSchema = new mongoose.Schema(
  {
    paymentId: { type: String, required: true, unique: true },
    studentId: { type: String, required: true },
    amount: { type: Number, required: true },
    method: { type: String, required: true },
    reference: { type: String, required: false },
    status: { type: String, required: true, default: 'Completed' },
    datePaid: { type: Date, required: true }
  },
  {
    collection: 'payments', // Explicitly bind this model to the existing payments collection.
    timestamps: true // Automatically add createdAt and updatedAt fields.
  }
);

// Export the model and reuse it if it is already registered with Mongoose.
module.exports = mongoose.models.Payment || mongoose.model('Payment', paymentSchema);
