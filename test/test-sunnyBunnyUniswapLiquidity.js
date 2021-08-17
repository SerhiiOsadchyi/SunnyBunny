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
  //let contractIERC20;
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
    tokenUniswapLiquidity = await SunnyBunnyUniswapLiquidity.new(
      sunnyBunnyToken.address, uniswapRouter.address, uniswapFactory.address
      );

    //todo почему не возвращает адрес пары?
    //pairAddress = await sunnyBunnyToken.createUniswapPair();

    await sunnyBunnyToken.createUniswapPair();
    pairAddress = await sunnyBunnyToken.tokenUniswapPair();
    pairUniswap = await IUniswapV2Pair.at(pairAddress);

    let approvedTokensToRouter = await sunnyBunnyToken.allowance(OWNER, uniswapRouter.address);
    console.log('approved sunnyBunnyToken To Router = ' + approvedTokensToRouter);

    balance = await sunnyBunnyToken.balanceOf(OWNER);
    console.log('balance sunnyBunnyToken OWNER = ' + balance);

    /*async function sendETH(contractName) {
      await contractName.send(BASE_UNIT);
      const balanceETH = await web3.eth.getBalance(contractName.address);
      console.log(`balance ETH ${contractName} contract = ${balanceETH}`);
    }

    await sendETH(tokenUniswapLiquidity);
    await sendETH(uniswapRouter);*/

    // todo remove it
    await tokenUniswapLiquidity.send(BASE_UNIT);
    let balanceETH = await web3.eth.getBalance(tokenUniswapLiquidity.address);
    console.log('balance ETH tokenUniswapLiquidity contract = ' + balanceETH);

    /*await uniswapRouter.send(BASE_UNIT);
    balanceETH = await web3.eth.getBalance(uniswapRouter.address);
    console.log('balance ETH uniswapRouter = ' + balanceETH);*/

  });

  describe('General tests', async () => {

    //Use add liquidity from original Uniswap
    it('should be possible to add liquidity on pair', async () => {

      console.log('==================     add liquidity     ================');

      //const liquidityTokensAmount = bn('10').mul(BASE_UNIT); // 10 tokens
      //const liquidityEtherAmount = bn('1').mul(BASE_UNIT); // 1 ETH
      const liquidityTokensAmount = 20000; // 20000 tokens
      const liquidityEtherAmount = 10000; // 10000 wei

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

    //Use remove liquidity from original Uniswap
    it('should be possible to remove liquidity on pair', async () => {

      console.log('==================     remove liquidity     ================');

      let liquidityAmount = await pairUniswap.balanceOf(OWNER);
      console.log('balance OWNER liquidityAmount before remove liquidity = ' + liquidityAmount);
      /*let halfLiquidityAmount = bn(liquidityAmount).div(bn('2'));
        let subLiquidityAmount = bn(liquidityAmount).sub(bn('2000000000'));
      */

      /*balance = await sunnyBunnyToken.balanceOf(EXTRA_ADDRESS);
        console.log('balance EXTRA_ADDRESS sunnyBunnyToken before remove liquidity = ' + balance);
      */

      await pairUniswap.approve(uniswapRouter.address, liquidityAmount);
      balance = await pairUniswap.balanceOf(uniswapRouter.address);
      console.log('balance pairUniswap at uniswapRouter = ' + balance);

      let approvedPairUniswapToRouter = await pairUniswap.allowance(OWNER, uniswapRouter.address);
      console.log('approved PairUniswap To Router = ' + approvedPairUniswapToRouter);

      // todo - почему так не работает - нет "weth.address"?
      //  Error: Returned error: VM Exception while processing transaction: revert TransferHelper:
      //  TRANSFER_FAILED -- Reason given: TransferHelper: TRANSFER_FAILED.
      /*await uniswapRouter.removeLiquidityETH(
        sunnyBunnyToken.address, '1000', 0, 0, OWNER,
        new Date().getTime() + 3000
      );*/

      await uniswapRouter.removeLiquidity(
        sunnyBunnyToken.address, weth.address, 12000, 0, 0, OWNER,
        new Date().getTime() + 3000
      );
      /*Не работает как надо:
        Было 13142
        Сжег 1000
        Осталось -9293
      */

      /*balance = await sunnyBunnyToken.balanceOf(OWNER);
        console.log('balance OWNER sunnyBunnyToken after remove liquidity = ' + balance);
        balance = await sunnyBunnyToken.balanceOf(EXTRA_ADDRESS);
        console.log('balance EXTRA_ADDRESS sunnyBunnyToken after remove liquidity = ' + balance);
      */

      const reservesAfter = await pairUniswap.getReserves();

      liquidityAmount = await pairUniswap.balanceOf(OWNER);
      console.log('liquidity Amount at OWNER  after remove liquidity = ' + liquidityAmount);
      console.log('reservesAfter[0] = ' + reservesAfter[0]);
      console.log('reservesAfter[1] = ' + reservesAfter[1]);

      /*assertBNequal(reservesAfter[0], 0);
        assertBNequal(reservesAfter[1], 0);
      */

      //assert.equal(reservesAfter[0], 0);
      //assert.equal(reservesAfter[1], 0);

    });

  })

})