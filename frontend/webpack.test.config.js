module.exports = {
  module: {
    rules: [
      {
        test: /flag-icons\/css\/.*\.css$/,
        use: ['style-loader', 'css-loader']
      },
      {
        test: /\.css$/,
        exclude: /flag-icons\/css/,
        use: ['null-loader']
      }
    ]
  }
};
