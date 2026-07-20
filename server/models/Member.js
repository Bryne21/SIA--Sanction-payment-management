const mongoose = require('mongoose');

// Member schema used by the controllers and frontend.
// Fields: id, name, email, balance, totalPaid, standing
const memberSchema = new mongoose.Schema(
  {
    id: { type: String, required: false, unique: true, sparse: true, index: true },
    studentId: { type: String, required: false, index: true },
    name: { type: String, required: false },
    firstName: { type: String, required: false },
    lastName: { type: String, required: false },
    middleName: { type: String, required: false },
    email: { type: String, required: false },
    balance: { type: Number, required: true, default: 0 },
    totalPaid: { type: Number, required: true, default: 0 },
    standing: { type: String, required: true, default: 'Good Standing' }
  },
  {
    //SASDASD
    collection: 'members',
    timestamps: true
  }
);

// Pre-validate middleware to automatically populate id and name if they are missing
memberSchema.pre('validate', function() {
  if (!this.id) {
    this.id = this.studentId || this._id.toString();
  }
  if (!this.name) {
    const parts = [this.firstName, this.lastName].filter(Boolean);
    this.name = parts.join(' ') || 'Unnamed Member';
  }
});

module.exports = mongoose.models.Member || mongoose.model('Member', memberSchema);
