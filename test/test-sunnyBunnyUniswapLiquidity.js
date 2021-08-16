const Ganache = require('./helpers/ganache');
const deployUniswap = require('./helpers/deployUniswap');
const { send, expectEvent, expectRevert, constants } = require('@openzeppelin/test-helpers');
const IUniswapV2Pair = artifacts.require('@uniswap/v2-core/IUniswapV2Pair');
const IERC20 = artifacts.require('@openzeppelin/contracts/token/IERC20');

const SunnyBunny = artifacts.require('SunnyBunny');
const SunnyBunnyUniswapLiquidity = artifacts.require('SunnyBunnyUniswapLiquidity');

contract('Sunny Bunny and Uniswap liquidity', function(accounts) {
  const ganache = new Ganache(web3);

  // todo - delete if not use anymore
  // afterEach('revert', ganache.revert);

  const bn = (input) => web3.utils.toBN(input);
  const assertBNequal = (bnOne, bnTwo) => assert.equal(bnOne.toString(), bnTwo.toString());

  const OWNER = accounts[0];
  const NOT_OWNER = accounts[1];
  const EXTRA_ADDRESS = accounts[2];
  const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
  const BASE_UNIT = bn('1000000000000000000');
  const TOKEN_AMOUNT = '1000000000000000000';

  let feeReceiver = accounts[3];
  let feePercent = 10;
  let sunnyBunnyToken;
  let tokenUniswapLiquidity;

  let uniswapFactory;
  let uniswapRouter;
  let contractIERC20;
  let weth;
  let pairUniswap;
  let pairAddress;

  before('setup others', async function() {
    const contracts = await deployUniswap(accounts);
    uniswapFactory = contracts.uniswapFactory;
    uniswapRouter = contracts.uniswapRouter;
    weth = contracts.weth;

    // deploy and setup main contracts
    sunnyBunnyToken = await SunnyBunny.new(feeReceiver, feePercent, uniswapRouter.address, uniswapFactory.address);
    console.log('sunnyBunnyToken address = ' + sunnyBunnyToken.address);
    console.log('uniswapRouter address = ' + uniswapRouter.address);
    console.log('uniswapFactory address = ' + uniswapFactory.address);

    tokenUniswapLiquidity = await SunnyBunnyUniswapLiquidity.new(
      sunnyBunnyToken.address, uniswapRouter.address, uniswapFactory.address
      );
    console.log('tokenUniswapLiquidity.address = ' + tokenUniswapLiquidity.address);

    //todo почему не возвращает адрес пары?
    //pairAddress = await sunnyBunnyToken.createUniswapPair();

    await sunnyBunnyToken.createUniswapPair();
    pairAddress = await sunnyBunnyToken.tokenUniswapPair();
    console.log('pairAddress = ' + pairAddress);

    pairUniswap = await IUniswapV2Pair.at(pairAddress);
    const reservesBefore = await pairUniswap.getReserves();

    console.log('pairAddress = ' + pairUniswap);

    await sunnyBunnyToken.approve(tokenUniswapLiquidity.address, TOKEN_AMOUNT);
    await sunnyBunnyToken.approve(uniswapFactory.address, TOKEN_AMOUNT);

    //todo - не работает allowance - ReferenceError: allowance is not defined
    /*let approvedTokensToRouter = await allowance(OWNER, ROUTER02);
      console.log('approvedTokensToRouter = ' + approvedTokensToRouter);
    */

    let balance = await sunnyBunnyToken.balanceOf(NOT_OWNER);
    let balanceETH = await web3.eth.getBalance(NOT_OWNER);
    console.log('balance = ' + balance);
    console.log('balanceETH = ' + balanceETH);

  });

  describe('General tests', async () => {

    //Use add liquidity from original Uniswap
    it('should be possible to add liquidity on pair', async () => {
      const liquidityTokensAmount = bn('10').mul(BASE_UNIT); // 10 tokens
      const liquidityEtherAmount = bn('1').mul(BASE_UNIT); // 1 ETH

      const reservesBefore = await pairUniswap.getReserves();
      assertBNequal(reservesBefore[0], 0);
      assertBNequal(reservesBefore[1], 0);

      await sunnyBunnyToken.approve(uniswapRouter.address, liquidityTokensAmount);

      await uniswapRouter.addLiquidityETH(
        sunnyBunnyToken.address, liquidityTokensAmount, 0, 0, OWNER, new Date().getTime() + 3000,
        {value: liquidityEtherAmount}
      );

      const reservesAfter = await pairUniswap.getReserves();

      if (await pairUniswap.token0() == sunnyBunnyToken.address) {
        assertBNequal(reservesAfter[0], liquidityTokensAmount);
        assertBNequal(reservesAfter[1], liquidityEtherAmount);
      } else {
        assertBNequal(reservesAfter[0], liquidityEtherAmount);
        assertBNequal(reservesAfter[1], liquidityTokensAmount);
      }
    });

    //Use remove liquidity from original Uniswap
    it('should be possible to remove liquidity on pair', async () => {

      const reservesAfter = await pairUniswap.getReserves();
      /*
        console.log('reservesAfter = ' + reservesAfter);
        for(let index in reservesAfter) {
          console.log('index = ' + index);
          console.log('reservesAfter = ' + reservesAfter[index]);
        }
      */

      const liquidityAmount = reservesAfter[2];
      console.log('liquidity Amount = ' + liquidityAmount);

      pairUniswap.approve(uniswapRouter.address, 1000)

      await uniswapRouter.removeLiquidityETH(
        sunnyBunnyToken.address, 1000, 0, 0, EXTRA_ADDRESS, new Date().getTime() + 3000
      );

      const balance = await sunnyBunnyToken.balanceOf(EXTRA_ADDRESS);
      console.log('balance = ' + balance);

    });

  })

})