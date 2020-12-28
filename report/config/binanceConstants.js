var constant = {
  BASE_API_URL : "https://api.binance.com",
  VERSION : "v3"
}

module.exports = Object.freeze({
  WS_URL : 'wss://stream.binance.com:9443/ws/tatreding',
  API_ORDER : constant.BASE_API_URL+'/api/'+constant.VERSION+'/klines',
  API_CANDLE_HISTORY : constant.BASE_API_URL+'/api/'+constant.VERSION+'/klines',
  API_ALL_ORDER : constant.BASE_API_URL+'/api/'+constant.VERSION+'/allOrders',
  API_APIKEY : 'mvwJsV0mKpWGj4oW9dRv7UR05f8iXbOjxfcCaFBkmBKd4tNwVR1WKlhUUd0I2jN8',
  API_SECRET_KEY : 'xx6h0S9su9DYLIJG417kENPnmDJpVCOKF0lfQYu1OxlmSmO5Vw6ZTtK1zO1uop1o',
  API_EXCHANGE_INFO : constant.BASE_API_URL+'/api/'+constant.VERSION+'/exchangeInfo',
  API_WALLET_INFO : constant.BASE_API_URL+'/api/'+constant.VERSION+'/account',
  API_ORDER : constant.BASE_API_URL+'/api/'+constant.VERSION+'/order/test',
  API_ALL_OPEN_ORDER : constant.BASE_API_URL+'/api/'+constant.VERSION+'/openOrders'
});
