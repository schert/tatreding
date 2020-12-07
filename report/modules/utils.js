var utils = {};

utils.pad = function(n, width, z) {
  z = (z == undefined ? '0' : z);
  n = n + '';
  return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
}

module.exports = utils;
