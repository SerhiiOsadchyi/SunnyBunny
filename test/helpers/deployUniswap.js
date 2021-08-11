const UniswapV2Factory = artifacts.require('IUniswapV2Factory');
//const UniswapV2Factory = artifacts.require('IUniswapV2Factory');
//const UniswapWETH = artifacts.require('WETH9');
//const UniswapWETH = artifacts.require('IWETH');
//const UniswapFactory = artifacts.require('UniswapFactory');
const UniswapV2Router02 = artifacts.require('IUniswapV2Router02');

async function deployUniswap(accounts) {
  const feeToSetter = accounts[0];
  const uniswapFactory = await UniswapV2Factory.new(feeToSetter);
  const weth = await UniswapV2Router02.WETH();
  const uniswapRouter = await UniswapV2Router02.new(uniswapFactory.address, weth.address);

  return { uniswapFactory, weth, uniswapRouter };
}

module.exports = deployUniswap;