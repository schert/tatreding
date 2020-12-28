var utils = {};

utils.pad = function(n, width, z) {
  z = (z == undefined ? '0' : z);
  n = n + '';
  return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
}

utils.convertArrayToObject = (array, key) => {
  const initialValue = {};
  return array.reduce((obj, item) => {
    return {
      ...obj,
      [item[key]]: item,
    };
  }, initialValue);
};

module.exports = utils;
