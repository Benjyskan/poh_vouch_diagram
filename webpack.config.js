const path = require('path');

      
module.exports = {
  entry: './src/index.js',
  output: {
    filename: 'js/index.js',
    path: path.resolve(__dirname, 'dist'),
  },
};
