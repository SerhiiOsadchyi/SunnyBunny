const Ganache = require('./helpers/ganache');
const deployUniswap = require('./helpers/deployUniswap');
const { send, expectEvent, expectRevert, constants } = require('@openzeppelin/test-helpers');
const IUniswapV2Pair = artifacts.require('@uniswap/v2-core/IUniswapV2Pair');
const truffleAssert = require('truffle-assertions');

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
  let feePercent = 0;
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

    console.log('OWNER address = ' + OWNER);
    console.log('uniswapRouter address = ' + uniswapRouter.address);
    console.log('sunnyBunnyToken address = ' + sunnyBunnyToken.address);
    console.log('liquidityInstance address = ' + liquidityInstance.address);
    console.log('pairUniswap address = ' + pairAddress);

    // TODO: send 1 ether to contract "SunnyBunnyUniswapLiquidity" - remove it if no need
    /*await liquidityInstance.send(BASE_UNIT);
      let balanceETH = await web3.eth.getBalance(liquidityInstance.address);
      console.log('balance ETH liquidityInstance contract = ' + balanceETH);

      await uniswapRouter.send(BASE_UNIT);
      balanceETH = await web3.eth.getBalance(uniswapRouter.address);
      console.log('balance ETH uniswapRouter = ' + balanceETH);
    */
  });

  describe('General tests with 0% of fee', async () => {

    //Use add liquidity from original Uniswap
    it('success add liquidity on pair', async () => {
      console.log('==================     add liquidity     ================');

      const liquidityTokensAmount = bn('100').mul(BASE_UNIT); // 100 tokens
      const liquidityEtherAmount = bn('10').mul(BASE_UNIT); // 10 ETH

      const reservesBefore = await pairUniswap.getReserves();
      assertBNequal(reservesBefore[0], 0);
      assertBNequal(reservesBefore[1], 0);

      await sunnyBunnyToken.approve(uniswapRouter.address, liquidityTokensAmount);

      let eventLogs = await uniswapRouter.addLiquidityETH(
        sunnyBunnyToken.address,
        liquidityTokensAmount,
        0,
        0,
        OWNER,
        new Date().getTime() + 3000,
        {value: liquidityEtherAmount}
      );
      truffleAssert.prettyPrintEmittedEvents(eventLogs);

      const reservesAfter = await pairUniswap.getReserves();

      if (await pairUniswap.token0() == sunnyBunnyToken.address) {
        assertBNequal(reservesAfter[0], liquidityTokensAmount);
        assertBNequal(reservesAfter[1], liquidityEtherAmount);
      } else {
        assertBNequal(reservesAfter[0], liquidityEtherAmount);
        assertBNequal(reservesAfter[1], liquidityTokensAmount);
      }
    });

    it('success swap ETH for SunnyBunny tokens', async () => {
      console.log('==================   swap ETH for SunnyBunny token   ================');
      const amountETH = bn('1').mul(BASE_UNIT); // 1 ether
      console.log('amount ETH = ' + amountETH);

      balance = await sunnyBunnyToken.balanceOf(pairAddress);
      console.log('balance sunnyBunnyToken of pair before a swap = ' + balance);

      //let eventLogs = await liquidityInstance.swapExactETHForTokens(0, {value: bn(amountETH) });
      let eventLogs = await liquidityInstance.swapExactETHForTokens({value: bn(amountETH) });
      truffleAssert.prettyPrintEmittedEvents(eventLogs);

      /**@author странный результат 100*1e18 - 10*1e18 = 90,933891061198508685*1e18. Откудв? */
      balance = await sunnyBunnyToken.balanceOf(pairAddress);
      console.log('balance sunnyBunnyToken of pair after a swap = ' + balance);
    });

    it('success swap SunnyBunny tokens for ETH', async () => {
      console.log('==================   swap SunnyBunny tokens for ETH   ================');
      const amount = bn('5').mul(BASE_UNIT); // 10 tokens
      console.log('amount tokens = ' + amount);

      balance = await weth.balanceOf(pairAddress);
      console.log('balance weth of pair before a swap = ' + balance);
      balance = await sunnyBunnyToken.balanceOf(pairAddress);
      console.log('balance sunnyBunnyToken of pair before a swap = ' + balance);

      let eventLogs = await liquidityInstance.swapExactTokensForETH(bn(amount).div(bn("2")), 0);
      truffleAssert.prettyPrintEmittedEvents(eventLogs);

      balance = await weth.balanceOf(pairAddress);
      console.log('balance weth of pair after a swap = ' + balance);
    });

    //Use remove liquidity from original Uniswap
    it('success remove liquidity on pair', async () => {
      console.log('==================     remove liquidity     ================');

      let liquidityAmount = await pairUniswap.balanceOf(OWNER);
      console.log('balance OWNER liquidityAmount before remove liquidity = ' + liquidityAmount);

      await pairUniswap.approve(uniswapRouter.address, liquidityAmount);
      balance = await pairUniswap.balanceOf(uniswapRouter.address);
      console.log('balance pairUniswap at uniswapRouter = ' + balance);

      let approvedPairUniswapToRouter = await pairUniswap.allowance(OWNER, uniswapRouter.address);
      console.log('approved PairUniswap To Router = ' + approvedPairUniswapToRouter);

      // TODO - не работает, если комиссия больше 0
      //  Error: Returned error: VM Exception while processing transaction: revert TransferHelper:
      //  TRANSFER_FAILED -- Reason given: TransferHelper: TRANSFER_FAILED.
      let eventLogs = await uniswapRouter.removeLiquidityETH(
        sunnyBunnyToken.address, liquidityAmount, 0, 0, OWNER,
        new Date().getTime() + 3000
      );
      truffleAssert.prettyPrintEmittedEvents(eventLogs);

      const reservesAfter = await pairUniswap.getReserves();
      liquidityAmount = await pairUniswap.balanceOf(OWNER);
      console.log('liquidity Amount at OWNER  after remove liquidity = ' + liquidityAmount);
      console.log('reservesAfter[0] = ' + reservesAfter[0]);
      console.log('reservesAfter[1] = ' + reservesAfter[1]);

      assertBNequal(liquidityAmount, 0);

    });
  })

  describe('General tests with 10% of fee', async () => {

    //Use add liquidity from original Uniswap
    it('success add liquidity on pair', async () => {
      console.log('==================     add liquidity with 10% of fee    ================');

      await sunnyBunnyToken.setFeePercent(10);
      feePercent = await sunnyBunnyToken.getFeePercent();

      const liquidityTokensAmount = bn('100').mul(BASE_UNIT); // 100 tokens
      const liquidityEtherAmount = bn('10').mul(BASE_UNIT); // 10 ETH

      await sunnyBunnyToken.approve(uniswapRouter.address, liquidityTokensAmount);

      await uniswapRouter.addLiquidityETH(
        sunnyBunnyToken.address,
        liquidityTokensAmount,
        0,
        0,
        OWNER,
        new Date().getTime() + 3000,
        {value: liquidityEtherAmount}
      );

      const reservesAfter = await pairUniswap.getReserves();

      if (await pairUniswap.token0() == sunnyBunnyToken.address) {
        console.log('liquidity Tokens Amount = ' + reservesAfter[0]);
        console.log('liquidity Ether Amount = ' + reservesAfter[1]);
      } else {
        console.log('liquidity Tokens Amount = ' + reservesAfter[1]);
        console.log('liquidity Ether Amount = ' + reservesAfter[0]);
      }
    });

    it('success swap ETH for SunnyBunny tokens', async () => {
      console.log('==================   swap ETH for SunnyBunny token with 10% of fee  ================');
      const amountETH = bn('1').mul(BASE_UNIT); // 1 ether
      console.log('amount ETH = ' + amountETH);

      balance = await sunnyBunnyToken.balanceOf(pairAddress);
      console.log('balance sunnyBunnyToken of pair before a swap = ' + balance);

      //let eventLogs = await liquidityInstance.swapExactETHForTokens(0, {value: bn(amountETH) });
      let eventLogs = await liquidityInstance.swapExactETHForTokens( {value: bn(amountETH) });
      truffleAssert.prettyPrintEmittedEvents(eventLogs);

      balance = await sunnyBunnyToken.balanceOf(pairAddress);
      console.log('balance sunnyBunnyToken of pair after a swap = ' + balance);
    });

    it('success swap SunnyBunny tokens for ETH', async () => {
      console.log('==================   swap SunnyBunny tokens for ETH with 10% of fee   ================');
      const amount = bn('5').mul(BASE_UNIT); // 10 tokens
      console.log('amount tokens = ' + amount);

      balance = await weth.balanceOf(pairAddress);
      console.log('balance weth of pair before a swap = ' + balance);
      balance = await sunnyBunnyToken.balanceOf(pairAddress);
      console.log('balance sunnyBunnyToken of pair before a swap = ' + balance);

      let eventLogs = await liquidityInstance.swapExactTokensForETH(bn(amount).div(bn("2")), 0);
      truffleAssert.prettyPrintEmittedEvents(eventLogs);

      balance = await weth.balanceOf(pairAddress);
      console.log('balance weth of pair after a swap = ' + balance);

      // !! todo - как это понимать?
    /**  if (address(config.infinityToken) < address(config.weth)) {*/

    });

    //Use remove liquidity from original Uniswap
    it('success remove liquidity on pair', async () => {
      console.log('==================     remove liquidity with 10% of fee     ================');

      balance = await pairUniswap.balanceOf(OWNER);
      console.log('balance OWNER before remove liquidity = ' + balance);

      //TODO почему баланс пары не зависит от адреса пользователя ?
      let balanceRouterTokens = await sunnyBunnyToken.balanceOf(pairAddress, {from: NOT_OWNER});
      console.log('balance Tokens at Uniswap from NOT_OWNER before remove liquidity = ' + balanceRouterTokens);
      balanceRouterTokens = await sunnyBunnyToken.balanceOf(pairAddress);
      console.log('balance Tokens at Uniswap from OWNER before remove liquidity = ' + balanceRouterTokens);

      const feeMultiplier = 100 - feePercent;
      const liquidityAmount = bn(balance).mul(bn(feeMultiplier)).div(bn('100'));
      console.log('balance OWNER liquidityAmount with fee before remove liquidity = ' + liquidityAmount);

      await pairUniswap.approve(uniswapRouter.address, liquidityAmount);
      balance = await pairUniswap.balanceOf(uniswapRouter.address);
      console.log('balance pairUniswap at uniswapRouter = ' + balance);

      let approvedPairUniswapToRouter = await pairUniswap.allowance(OWNER, uniswapRouter.address);
      console.log('approved PairUniswap To Router = ' + approvedPairUniswapToRouter);

      // TODO - не работает, если комиссия больше 0
      //  Error: Returned error: VM Exception while processing transaction: revert TransferHelper:
      //  TRANSFER_FAILED -- Reason given: TransferHelper: TRANSFER_FAILED.
      let eventLogs = await uniswapRouter.removeLiquidityETH(
        sunnyBunnyToken.address, liquidityAmount, 0, 0, OWNER,
        new Date().getTime() + 3000
      );
      truffleAssert.prettyPrintEmittedEvents(eventLogs);

      const reservesAfter = await pairUniswap.getReserves();

      liquidityAmount = await pairUniswap.balanceOf(OWNER);
      console.log('liquidity Amount at OWNER  after remove liquidity = ' + liquidityAmount);
      console.log('reservesAfter[0] = ' + reservesAfter[0]);
      console.log('reservesAfter[1] = ' + reservesAfter[1]);

      assertBNequal(liquidityAmount, 0);

    });

  })

})


// TODO: it for small number only - remove it if no need
      //const liquidityTokensAmount = 20000; // 20000 tokens
      //const liquidityEtherAmount = 10000; // 10000 wei



/** @author ==================   swap ETH for SunnyBunny token   ================ */

      /**
       * TODO: Errors next 15 strings
        ** Error: Returned error: VM Exception while processing transaction:
        ** revert UniswapV2: K -- Reason given: UniswapV2: K.
      */

  /**@author try to use original swapExactETHForTokens for token with fee */
    /*await uniswapRouter.swapExactETHForTokensSupportingFeeOnTransferTokens(
        0,
        [weth.address, sunnyBunnyToken.address],  // revert UniswapV2: K -- Reason given: UniswapV2: K
        // [sunnyBunnyToken.address, weth.address],  //  revert UniswapV2Router: INVALID_PATH -- Reason given: UniswapV2Router: INVALID_PATH.
        //liquidityInstance.address,
        OWNER,
        new Date().getTime() + 3000,
        { value: amountETH }
    );
    */

  /**@author try to use original swapExactETHForTokens for token without fee */
    /*await uniswapRouter.swapExactETHForTokens(
      0,
      [weth.address, sunnyBunnyToken.address],
      //liquidityInstance.address,
      OWNER,
      new Date().getTime() + 3000,
      { value: amountETH }
    );
    */

  /**@author try to convert ETH to WETH and use these like two ERC20 tokens */
    /*await weth.deposit({value: amountETH});
    let balanceWeth = await weth.balanceOf(OWNER);
    console.log('balance WETH of OWNER = ' + balanceWeth);

    let halfBalanceWeth = bn(balanceWeth).div(bn('2'));
    console.log('half balance WETH of OWNER = ' + halfBalanceWeth);

    await weth.approve(uniswapRouter.address, halfBalanceWeth);
    let approvedWethToRouter = await weth.allowance(OWNER, uniswapRouter.address);
    console.log('approved weth To Router = ' + approvedWethToRouter);

    await uniswapRouter.swapExactTokensForTokensSupportingFeeOnTransferTokens(
      halfBalanceWeth,
      0,
      [weth.address, sunnyBunnyToken.address], // revert UniswapV2: K -- Reason given: UniswapV2: K.
      //[sunnyBunnyToken.address, weth.address], // revert TransferHelper: TRANSFER_FROM_FAILED
      //liquidityInstance.address,
      OWNER,
      new Date().getTime() + 3000
    );
  */



/** @author ============== remove liquidity  ====================== */

    //TODO: test with small numbers - remove it if no need more
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
    /*await uniswapRouter.removeLiquidity(
      sunnyBunnyToken.address,
      weth.address,
      bn(liquidityAmount).sub(bn('11622776601683792319')),
      0,
      0,
      OWNER,
      new Date().getTime() + 3000
    );
    */