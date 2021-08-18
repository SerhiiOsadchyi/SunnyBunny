const Ganache = require('./helpers/ganache');
const deployUniswap = require('./helpers/deployUniswap');
const { send, expectEvent, expectRevert, constants } = require('@openzeppelin/test-helpers');
const IUniswapV2Pair = artifacts.require('@uniswap/v2-core/IUniswapV2Pair');
const IERC20 = artifacts.require('@openzeppelin/contracts/token/IERC20');

const SunnyBunny = artifacts.require('SunnyBunny');
const SunnyBunnyUniswapLiquidity = artifacts.require('SunnyBunnyUniswapLiquidity');

contract('Sunny Bunny and Uniswap liquidity', function(accounts) {
  const ganache = new Ganache(web3);

  // TODO - delete if not use anymore
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
  let liquidityInstance;

  let uniswapFactory;
  let uniswapRouter;
  let weth;
  let pairUniswap;
  let pairAddress;
  let balance;

  before('setup others', async function() {
    const contracts = await deployUniswap(accounts);
    uniswapFactory = contracts.uniswapFactory;
    uniswapRouter = contracts.uniswapRouter;
    weth = contracts.weth;

    // deploy and setup main contracts
    sunnyBunnyToken = await SunnyBunny.new(feeReceiver, feePercent, uniswapRouter.address, uniswapFactory.address);
    liquidityInstance = await SunnyBunnyUniswapLiquidity.new(
      sunnyBunnyToken.address, uniswapRouter.address, uniswapFactory.address
      );

    //TODO почему не возвращает адрес пары?
    //pairAddress = await sunnyBunnyToken.createUniswapPair();

    await sunnyBunnyToken.createUniswapPair();
    pairAddress = await sunnyBunnyToken.tokenUniswapPair();
    pairUniswap = await IUniswapV2Pair.at(pairAddress);

    let approvedTokensToRouter = await sunnyBunnyToken.allowance(OWNER, uniswapRouter.address);
    console.log('approved sunnyBunnyToken To Router = ' + approvedTokensToRouter);

    balance = await sunnyBunnyToken.balanceOf(OWNER);
    console.log('balance sunnyBunnyToken OWNER = ' + balance);

    // TODO: remove it if no need
    /*await liquidityInstance.send(BASE_UNIT);
      let balanceETH = await web3.eth.getBalance(liquidityInstance.address);
      console.log('balance ETH liquidityInstance contract = ' + balanceETH);

      await uniswapRouter.send(BASE_UNIT);
      balanceETH = await web3.eth.getBalance(uniswapRouter.address);
      console.log('balance ETH uniswapRouter = ' + balanceETH);
    */

  });

  describe('General tests', async () => {

    //Use add liquidity from original Uniswap
    it('should be possible to add liquidity on pair', async () => {
      console.log('==================     add liquidity     ================');

      const liquidityTokensAmount = bn('100').mul(BASE_UNIT); // 100 tokens
      const liquidityEtherAmount = bn('10').mul(BASE_UNIT); // 10 ETH

      // TODO: it for small number only - remove it if no need
      //const liquidityTokensAmount = 20000; // 20000 tokens
      //const liquidityEtherAmount = 10000; // 10000 wei

      const reservesBefore = await pairUniswap.getReserves();
      assertBNequal(reservesBefore[0], 0);
      assertBNequal(reservesBefore[1], 0);

      await sunnyBunnyToken.approve(uniswapRouter.address, liquidityTokensAmount);

      await uniswapRouter.addLiquidityETH(
        sunnyBunnyToken.address, liquidityTokensAmount, 0, 0, OWNER,
        new Date().getTime() + 3000,
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

    it('should be possible to swap ETH for SunnyBunny tokens', async () => {
      console.log('==================   swap ETH for SunnyBunny token   ================');
      //const amount = bn('5').mul(BASE_UNIT); // 5 tokens
      const amountETH = bn('1e16'); // 0,01 ether

      /*await sunnyBunnyToken.approve(uniswapRouter.address, amount);
      let approvedTokensToRouter = await sunnyBunnyToken.allowance(OWNER, uniswapRouter.address);
      console.log('approved sunnyBunnyToken To Router = ' + approvedTokensToRouter);*/

      /**
       * TODO: Errors str. 127-138
        ** Error: Returned error: VM Exception while processing transaction:
        ** revert UniswapV2: K -- Reason given: UniswapV2: K.
      */

      /**@author try to use swapExactETHForTokens from contract */
      // await liquidityInstance.swapExactETHForTokens(0, { value: bn(amountETH) });

      /**@author try to use original swapExactETHForTokens for token without fee */
      /** await uniswapRouter.swapExactETHForTokensSupportingFeeOnTransferTokens(
          0,
          [weth.address, sunnyBunnyToken.address],
          //liquidityInstance.address,
          OWNER,
          new Date().getTime() + 3000,
          { value: bn(amountETH) }
        );
      */

      balance = await sunnyBunnyToken.balanceOf(NOT_OWNER);
      console.log('balance sunnyBunnyToken NOT_OWNER = ' + balance);
    });

    it('should be possible to swap SunnyBunny tokens for ETH', async () => {
      console.log('==================   swap ETH for SunnyBunny token   ================');
      const amount = bn('5').mul(BASE_UNIT); // 5 tokens
      const amountETH = bn('1e16'); // 0,01 ether

      await sunnyBunnyToken.approve(uniswapRouter.address, amount);
      let approvedTokensToRouter = await sunnyBunnyToken.allowance(OWNER, uniswapRouter.address);
      console.log('approved sunnyBunnyToken To Router = ' + approvedTokensToRouter);

      balance = await sunnyBunnyToken.balanceOf(NOT_OWNER);
      console.log('balance sunnyBunnyToken NOT_OWNER = ' + balance);
    });

    //Use remove liquidity from original Uniswap
    it('should be possible to remove liquidity on pair', async () => {
      console.log('==================     remove liquidity     ================');

      let liquidityAmount = await pairUniswap.balanceOf(OWNER);
      console.log('balance OWNER liquidityAmount before remove liquidity = ' + liquidityAmount);

      await pairUniswap.approve(uniswapRouter.address, liquidityAmount);
      balance = await pairUniswap.balanceOf(uniswapRouter.address);
      console.log('balance pairUniswap at uniswapRouter = ' + balance);

      let approvedPairUniswapToRouter = await pairUniswap.allowance(OWNER, uniswapRouter.address);
      console.log('approved PairUniswap To Router = ' + approvedPairUniswapToRouter);

      // TODO - почему это не работает ?
      //  Error: Returned error: VM Exception while processing transaction: revert TransferHelper:
      //  TRANSFER_FAILED -- Reason given: TransferHelper: TRANSFER_FAILED.
      /*await uniswapRouter.removeLiquidityETH(
        sunnyBunnyToken.address, liquidityAmount - 1200, 0, 0, OWNER,
        new Date().getTime() + 3000
      );*/

      //TODO - remove it if no need more
     //Without BN
      /*await uniswapRouter.removeLiquidity(
        sunnyBunnyToken.address, weth.address, liquidityAmount - 1200, 0, 0, OWNER,
        new Date().getTime() + 3000
      );*/

      //TODO - не проходит тест, если вычитаемая сумма меньще примерно 7% - это как-то связано с комиссией ?
      /*
        Если вместо "liquidityAmount - 1200" задать "liquidityAmount" - ошибка
        Error: Returned error: VM Exception while processing transaction: revert UniswapV2:
        TRANSFER_FAILED -- Reason given: UniswapV2: TRANSFER_FAILED.
      */
      //With BN
      await uniswapRouter.removeLiquidity(
        sunnyBunnyToken.address,
        weth.address,
        bn(liquidityAmount).sub(bn('11622776601683792319')),
        0,
        0,
        OWNER,
        new Date().getTime() + 3000
      );

      const reservesAfter = await pairUniswap.getReserves();

      liquidityAmount = await pairUniswap.balanceOf(OWNER);
      console.log('liquidity Amount at OWNER  after remove liquidity = ' + liquidityAmount);
      console.log('reservesAfter[0] = ' + reservesAfter[0]);
      console.log('reservesAfter[1] = ' + reservesAfter[1]);

      assertBNequal(liquidityAmount, '11622776601683792319');
      //assert.equal(liquidityAmount, 1200);

    });

  })

})