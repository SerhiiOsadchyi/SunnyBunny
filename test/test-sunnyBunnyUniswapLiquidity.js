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

      balance = await sunnyBunnyToken.balanceOf(OWNER);
      console.log('balance sunnyBunnyToken OWNER = ' + balance);
      await sunnyBunnyToken.transfer(liquidityInstance.address, bn(balance).div(bn(10)));
      console.log('balance sunnyBunny Token liquidity Instance = ' +  await sunnyBunnyToken.balanceOf(liquidityInstance.address));

      const liquidityTokensAmount = bn('100').mul(BASE_UNIT); // 100 tokens
      const liquidityEtherAmount = bn('10').mul(BASE_UNIT); // 10 ETH

      const reservesBefore = await pairUniswap.getReserves();
      assertBNequal(reservesBefore[0], 0);
      assertBNequal(reservesBefore[1], 0);

      let eventLogs = await liquidityInstance.addLiquidETH(liquidityTokensAmount, {value: liquidityEtherAmount});
      truffleAssert.prettyPrintEmittedEvents(eventLogs);

      let liquidityAmount = await pairUniswap.balanceOf(liquidityInstance.address); 
      console.log('liquidity Amount at liquidity Instance = ' + liquidityAmount);
      liquidityAmount = await pairUniswap.balanceOf(OWNER); 
      console.log('liquidity Amount at OWNER = ' + liquidityAmount);

      const reservesAfter = await pairUniswap.getReserves();

      if (await pairUniswap.token0() == sunnyBunnyToken.address) {
        assertBNequal(reservesAfter[0], liquidityTokensAmount);
        assertBNequal(reservesAfter[1], liquidityEtherAmount);
      } else {
        assertBNequal(reservesAfter[0], liquidityEtherAmount);
        assertBNequal(reservesAfter[1], liquidityTokensAmount);
      }
    });

    it('success add liquidity on pair by  NOT_OWNER', async () => {
      console.log('==================     add liquidity by NOT_OWNER   ================');

      await sunnyBunnyToken.transfer(NOT_OWNER, bn(balance).div(bn(20)));
      balance = await sunnyBunnyToken.balanceOf(NOT_OWNER);
      await sunnyBunnyToken.transfer(liquidityInstance.address, bn(balance).div(bn(10)), { from: NOT_OWNER });
      let balanceTokenLiquidityInstance =  await sunnyBunnyToken.balanceOf(liquidityInstance.address, { from: NOT_OWNER })
      console.log('balance sunnyBunny Token liquidity Instance = ' + balanceTokenLiquidityInstance);

      const liquidityTokensAmount = bn('100').mul(BASE_UNIT); // 100 tokens
      const liquidityEtherAmount = bn('10').mul(BASE_UNIT); // 10 ETH

      /*const reservesBefore = await pairUniswap.getReserves();
      assertBNequal(reservesBefore[0], 0);
      assertBNequal(reservesBefore[1], 0);*/

      let eventLogs = await liquidityInstance.addLiquidETH(liquidityTokensAmount, { from: NOT_OWNER, value: liquidityEtherAmount });
      truffleAssert.prettyPrintEmittedEvents(eventLogs);

      liquidityAmount = await pairUniswap.balanceOf(NOT_OWNER); 
      console.log('liquidity Amount at OWNER = ' + liquidityAmount);

      /*
      let liquidityAmount = await pairUniswap.balanceOf(liquidityInstance.address); 
      console.log('liquidity Amount at liquidity Instance = ' + liquidityAmount);

      const reservesAfter = await pairUniswap.getReserves();

      if (await pairUniswap.token0() == sunnyBunnyToken.address) {
        assertBNequal(reservesAfter[0], liquidityTokensAmount);
        assertBNequal(reservesAfter[1], liquidityEtherAmount);
      } else {
        assertBNequal(reservesAfter[0], liquidityEtherAmount);
        assertBNequal(reservesAfter[1], liquidityTokensAmount);
      }
      */
    });

    it('success swap ETH for SunnyBunny tokens', async () => {
      console.log('==================   swap ETH for SunnyBunny token   ================');
      const amountETH = bn('1').mul(BASE_UNIT); // 1 ether
      console.log('amount ETH = ' + amountETH);

      balance = await sunnyBunnyToken.balanceOf(pairAddress);
      console.log('balance sunnyBunnyToken of pair before a swap = ' + balance);

      //let eventLogs = await liquidityInstance.swapExactETHForTokens(0, {value: bn(amountETH) });
      let eventLogs = await liquidityInstance.swapExactETHForTokens({ value: bn(amountETH) });
      truffleAssert.prettyPrintEmittedEvents(eventLogs);

      //TODO странный результат 100*1e18 - 10*1e18 = 90,933891061198508685*1e18. Откудв? */
      balance = await sunnyBunnyToken.balanceOf(pairAddress);
      console.log('balance sunnyBunnyToken of pair after a swap = ' + balance);
    });

    it('success swap SunnyBunny tokens for ETH', async () => {
      console.log('==================   swap SunnyBunny tokens for ETH   ================');
      const amount = bn('5').mul(BASE_UNIT); // 10 tokens

      let eventLogs = await liquidityInstance.swapExactTokensForETH(bn(amount).div(bn(2)), 0);
      truffleAssert.prettyPrintEmittedEvents(eventLogs);
    });

    it('success remove liquidity on pair by Owner', async () => {
      console.log('==================     remove liquidity by OWNER     ================');

      let liquidityAmountOWNER = await pairUniswap.balanceOf(OWNER);
      console.log('liquidity Amount balance OWNER before remove liquidity = ' + liquidityAmount);
      let liquidityAmount = await pairUniswap.balanceOf(NOT_OWNER);
      console.log('liquidity Amount balance NOT_OWNER before remove liquidity = ' + liquidityAmount);

      await pairUniswap.transfer(liquidityInstance.address, liquidityAmountOWNER);

      balance = await sunnyBunnyToken.balanceOf(feeReceiver);
      console.log('token balance fee Receiver before remove liquidity = ' + balance);
      balance = await sunnyBunnyToken.balanceOf(OWNER);
      console.log('token balance OWNER before remove liquidity = ' + balance);
      balance = await web3.eth.getBalance(OWNER);
      console.log('ETH balance OWNER before remove liquidity = ' + balance);

      let eventLogs = await liquidityInstance.removeLiquid(liquidityAmount);
      truffleAssert.prettyPrintEmittedEvents(eventLogs);

      balance = await sunnyBunnyToken.balanceOf(feeReceiver);
      console.log('token balance fee Receiver after remove liquidity = ' + balance);
      balance = await sunnyBunnyToken.balanceOf(OWNER);
      console.log('token balance OWNER after remove liquidity = ' + balance);
      balance = await web3.eth.getBalance(OWNER);
      console.log('ETH balance OWNER after remove liquidity = ' + balance);

      //assertBNequal(liquidityAmount, 0);
    });

    it('success remove liquidity on pair by NOT_OWNER', async () => {
      console.log('==================     remove liquidity by NOT_OWNER     ================');

      let liquidityAmount = await pairUniswap.balanceOf(NOT_OWNER);
      await pairUniswap.transfer(liquidityInstance.address, liquidityAmount, { from: NOT_OWNER });

      balance = await sunnyBunnyToken.balanceOf(feeReceiver);
      console.log('token balance fee Receiver before remove liquidity = ' + balance);
      balance = await sunnyBunnyToken.balanceOf(NOT_OWNER);
      console.log('token balance NOT_OWNER before remove liquidity = ' + balance);
      balance = await web3.eth.getBalance(NOT_OWNER);
      console.log('ETH balance NOT_OWNER before remove liquidity = ' + balance);

      let eventLogs = await liquidityInstance.removeLiquid(liquidityAmount, { from: NOT_OWNER });
      truffleAssert.prettyPrintEmittedEvents(eventLogs);

      balance = await sunnyBunnyToken.balanceOf(feeReceiver);
      console.log('token balance fee Receiver after remove liquidity = ' + balance);
      balance = await sunnyBunnyToken.balanceOf(NOT_OWNER);
      console.log('token balance OWNER after remove liquidity = ' + balance);
      balance = await web3.eth.getBalance(NOT_OWNER);
      console.log('ETH balance OWNER after remove liquidity = ' + balance);

      //assertBNequal(liquidityAmount, 0);
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

      let eventLogs = await liquidityInstance.addLiquidETH(liquidityTokensAmount, {value: liquidityEtherAmount});

      /*
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
      */
    });

    //Use add liquidity from original Uniswap
    it('success add liquidity on pair WETH - token  with 10% of fee', async () => {
      console.log('==================     add liquidity  WETH - token with 10% of fee    ================');

      const liquidityTokensAmount = bn('100').mul(BASE_UNIT); // 100 tokens
      const liquidityEtherAmount = bn('10').mul(BASE_UNIT); // 10 ETH

      await weth.deposit({value: liquidityEtherAmount});
      let balanceWeth = await weth.balanceOf(OWNER);

      await sunnyBunnyToken.approve(uniswapRouter.address, liquidityTokensAmount);

      let halfBalanceWeth = bn(balanceWeth).div(bn('2'));

      await weth.approve(uniswapRouter.address, halfBalanceWeth);

      await uniswapRouter.addLiquidity(
        weth.address,
        sunnyBunnyToken.address,
        halfBalanceWeth,
        liquidityTokensAmount,
        0,
        0,
        OWNER,
        new Date().getTime() + 3000
      );
    });

    it('success add liquidity on pair by  NOT_OWNER with 10% of fee', async () => {
      console.log('==================     add liquidity by NOT_OWNER with 10% of fee  ================');

      await sunnyBunnyToken.transfer(NOT_OWNER, bn(balance).div(bn(20)));
      balance = await sunnyBunnyToken.balanceOf(NOT_OWNER);
      await sunnyBunnyToken.transfer(liquidityInstance.address, bn(balance).div(bn(10)), { from: NOT_OWNER });
      let balanceTokenLiquidityInstance =  await sunnyBunnyToken.balanceOf(liquidityInstance.address, { from: NOT_OWNER })
      console.log('balance sunnyBunny Token liquidity Instance = ' + balanceTokenLiquidityInstance);

      const liquidityTokensAmount = bn('100').mul(BASE_UNIT); // 100 tokens
      const liquidityEtherAmount = bn('10').mul(BASE_UNIT); // 10 ETH

      /*const reservesBefore = await pairUniswap.getReserves();
      assertBNequal(reservesBefore[0], 0);
      assertBNequal(reservesBefore[1], 0);*/

      let eventLogs = await liquidityInstance.addLiquidETH(liquidityTokensAmount, { from: NOT_OWNER, value: liquidityEtherAmount });
      truffleAssert.prettyPrintEmittedEvents(eventLogs);

      liquidityAmount = await pairUniswap.balanceOf(NOT_OWNER); 
      console.log('liquidity Amount at OWNER = ' + liquidityAmount);

      /*
      let liquidityAmount = await pairUniswap.balanceOf(liquidityInstance.address); 
      console.log('liquidity Amount at liquidity Instance = ' + liquidityAmount);

      const reservesAfter = await pairUniswap.getReserves();

      if (await pairUniswap.token0() == sunnyBunnyToken.address) {
        assertBNequal(reservesAfter[0], liquidityTokensAmount);
        assertBNequal(reservesAfter[1], liquidityEtherAmount);
      } else {
        assertBNequal(reservesAfter[0], liquidityEtherAmount);
        assertBNequal(reservesAfter[1], liquidityTokensAmount);
      }
      */
    });

    it('success swap ETH for SunnyBunny tokens from OWNER with 10% of fee', async () => {
      console.log('==================   swap ETH for SunnyBunny token with 10% of fee  ================');
      const amountETH = bn('2').mul(BASE_UNIT).div(bn(10)); // 0.2 ether
      console.log('amount ETH = ' + amountETH);

      /*
        balance = await sunnyBunnyToken.balanceOf(OWNER);
        console.log('balance sunnyBunnyToken at OWNER before a swap = ' + balance);
        balance = await sunnyBunnyToken.balanceOf(liquidityInstance.address);
        console.log('balance sunnyBunnyToken at liquidity Instance before a swap = ' + balance);
        balance = await sunnyBunnyToken.balanceOf(feeReceiver);
        console.log('balance sunnyBunnyToken at fee Receiver before a swap = ' + balance);
      */

      let eventLogs = await liquidityInstance.swapExactETHForTokens( {from: NOT_OWNER, value: bn(amountETH) });
      truffleAssert.prettyPrintEmittedEvents(eventLogs);

      /*
        balance = await sunnyBunnyToken.balanceOf(OWNER);
        console.log('balance sunnyBunnyToken at OWNER after a swap = ' + balance);
        balance = await sunnyBunnyToken.balanceOf(liquidityInstance.address);
        console.log('balance sunnyBunnyToken at liquidity Instance after a swap = ' + balance);
        balance = await sunnyBunnyToken.balanceOf(feeReceiver);
        console.log('balance sunnyBunnyToken at fee Receiver after a swap = ' + balance);
      */
    });

    it('success swap ETH for SunnyBunny tokens from NOT_OWNER with 10% of fee', async () => {
      console.log('==================   swap ETH for SunnyBunny token with 10% of fee  ================');
      const amountETH = bn('2').mul(BASE_UNIT).div(bn(10)); // 0.2 ether
      console.log('amount ETH = ' + amountETH);

      /*
        balance = await sunnyBunnyToken.balanceOf(liquidityInstance.address);
        console.log('balance sunnyBunnyToken at liquidity Instance before a swap = ' + balance);
        balance = await sunnyBunnyToken.balanceOf(NOT_OWNER);
        console.log('balance sunnyBunnyToken at NOT_OWNER before a swap = ' + balance);
        balance = await sunnyBunnyToken.balanceOf(feeReceiver);
        console.log('balance sunnyBunnyToken at fee Receiver before a swap = ' + balance);
      */

      let eventLogs = await liquidityInstance.swapExactETHForTokens( {from: NOT_OWNER, value: bn(amountETH) });
      truffleAssert.prettyPrintEmittedEvents(eventLogs);

      /*
        balance = await sunnyBunnyToken.balanceOf(liquidityInstance.address);
        console.log('balance sunnyBunnyToken at liquidity Instance after a swap = ' + balance);
        balance = await sunnyBunnyToken.balanceOf(NOT_OWNER);
        console.log('balance sunnyBunnyToken at NOT_OWNER after a swap = ' + balance);
        balance = await sunnyBunnyToken.balanceOf(feeReceiver);
        console.log('balance sunnyBunnyToken at fee Receiver after a swap = ' + balance);
      */
    });

    it('success swap SunnyBunny tokens for ETH with 10% of fee', async () => {
      console.log('==================   swap SunnyBunny tokens for ETH with 10% of fee   ================');

      const amount = bn('5').mul(BASE_UNIT); // 5 tokens

      /*
        balance = await weth.balanceOf(pairAddress);
        console.log('balance weth of pair before a swap = ' + balance);
        balance = await sunnyBunnyToken.balanceOf(pairAddress);
        console.log('balance sunnyBunnyToken of pair before a swap = ' + balance);
      */

      let eventLogs = await liquidityInstance.swapExactTokensForETH(bn(amount).div(bn("2")), 0);
      truffleAssert.prettyPrintEmittedEvents(eventLogs);

      balance = await weth.balanceOf(pairAddress);
      console.log('balance weth of pair after a swap = ' + balance);

      // !! todo - как это работает?
    /**  if (address(config.infinityToken) < address(config.weth)) {*/

    });


    it('success remove liquidity on pair with 10% of fee', async () => {
      console.log('==================     remove liquidity with 10% of fee     ================');

      balance = await pairUniswap.balanceOf(OWNER);
      console.log('balance pair OWNER before remove liquidity = ' + balance);
      let feeLiquidityAmount = bn(balance).mul(bn(feePercent)).div(bn('100'));
      let liquidityReturnToOwner = bn(balance).sub(bn(feeLiquidityAmount));

      //TODO почему баланс пары не зависит от адреса пользователя ?
      let balanceRouterTokens = await sunnyBunnyToken.balanceOf(pairAddress);
      console.log('balance Tokens at Uniswap from NOT_OWNER before remove liquidity = ' + balanceRouterTokens);

      //await pairUniswap.approve(uniswapRouter.address, balance);

      /*await uniswapRouter.removeLiquidityETH(
        sunnyBunnyToken.address, liquidityReturnToOwner, 0, 0, OWNER,
        new Date().getTime() + 3000
      );

      await uniswapRouter.removeLiquidityETH(
        sunnyBunnyToken.address, feeLiquidityAmount, 0, 0, feeReceiver,
        new Date().getTime() + 3000
      );*/

      let eventLogs = await liquidityInstance.removeLiquid(balance);

      const reservesAfter = await pairUniswap.getReserves();

      checkLiquidityAmount = await pairUniswap.balanceOf(OWNER);
      console.log('liquidity Amount at OWNER  after remove liquidity = ' + checkLiquidityAmount);
      console.log('reservesAfter[0] = ' + reservesAfter[0]);
      console.log('reservesAfter[1] = ' + reservesAfter[1]);

      //assertBNequal(checkLiquidityAmount, 0);

    });

    it('success remove liquidity on pair by NOT_OWNER with 10% of fee', async () => {
      console.log('==================     remove liquidity by NOT_OWNER with 10% of fee     ================');

      let liquidityAmount = await pairUniswap.balanceOf(NOT_OWNER);
      await pairUniswap.transfer(liquidityInstance.address, liquidityAmount, { from: NOT_OWNER });

      balance = await sunnyBunnyToken.balanceOf(feeReceiver);
      console.log('token balance fee Receiver before remove liquidity = ' + balance);
      balance = await sunnyBunnyToken.balanceOf(NOT_OWNER);
      console.log('token balance NOT_OWNER before remove liquidity = ' + balance);
      balance = await web3.eth.getBalance(NOT_OWNER);
      console.log('ETH balance NOT_OWNER before remove liquidity = ' + balance);

      let eventLogs = await liquidityInstance.removeLiquid(liquidityAmount, { from: NOT_OWNER });
      truffleAssert.prettyPrintEmittedEvents(eventLogs);

      balance = await sunnyBunnyToken.balanceOf(feeReceiver);
      console.log('token balance fee Receiver after remove liquidity = ' + balance);
      balance = await sunnyBunnyToken.balanceOf(NOT_OWNER);
      console.log('token balance OWNER after remove liquidity = ' + balance);
      balance = await web3.eth.getBalance(NOT_OWNER);
      console.log('ETH balance OWNER after remove liquidity = ' + balance);

      //assertBNequal(liquidityAmount, 0);
    });

  })

})


    /** ============  DELETE ALL BELOW ============= */
