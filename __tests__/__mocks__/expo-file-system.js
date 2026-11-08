module.exports = {
  documentDirectory: 'file:///mock/documents/',
  cacheDirectory: 'file:///mock/cache/',
  getInfoAsync: jest.fn().mockResolvedValue({ exists: true, isDirectory: false, size: 1024 }),
  makeDirectoryAsync: jest.fn().mockResolvedValue(undefined),
  copyAsync: jest.fn().mockResolvedValue(undefined),
  writeAsStringAsync: jest.fn().mockResolvedValue(undefined),
  readAsStringAsync: jest.fn().mockResolvedValue('AQIDBA=='),
  deleteAsync: jest.fn().mockResolvedValue(undefined),
  EncodingType: {
    Base64: 'base64',
    UTF8: 'utf8',
  },
};
