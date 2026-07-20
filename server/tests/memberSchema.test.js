const test = require('node:test');
const assert = require('node:assert/strict');
const Member = require('../models/Member');

test('member documents do not persist a balance field', () => {
  const member = new Member({
    id: 'member-1',
    name: 'Aaliyah Reyes',
    totalPaid: 100,
    standing: 'Good Standing'
  });

  const plain = member.toObject();
  assert.equal(member.schema.path('balance'), undefined);
  assert.equal('balance' in plain, false);
});

test('member documents can store a course value', () => {
  const member = new Member({
    id: 'member-2',
    name: 'Aaliyah Reyes',
    course: 'BSIT',
    totalPaid: 100,
    standing: 'Good Standing'
  });

  const plain = member.toObject();
  assert.equal(plain.course, 'BSIT');
});
