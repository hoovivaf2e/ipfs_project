module.exports = {
  devServer: {
    proxy: {
      '/api': {
        target: 'http://localhost:8545',
        changeOrigin: true,
        ws: true,
        pathRewrite: {
          '^/api': ''
        }
      }
    }
  }
}
