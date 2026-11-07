module.exports = {
  Fields: {
    PhoneNumbers: 'phoneNumbers',
    Emails: 'emails',
    Name: 'name',
    FirstName: 'firstName',
    LastName: 'lastName',
    Company: 'company',
  },
  SortTypes: {
    FirstName: 'firstName',
    LastName: 'lastName',
    UserDefault: 'userDefault',
  },
  getPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
  requestPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
  getContactsAsync: jest.fn(async () => ({ data: [] })),
};
