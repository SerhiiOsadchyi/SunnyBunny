const Ganache = require('./helpers/ganache');
const { send, expectEvent, expectRevert, constants } = require('@openzeppelin/test-helpers');
const UniswapV2Router02 =  artifacts.require('@uniswap/v2-periphery/UniswapV2Router02');
const UniswapV2Factory = artifacts.require('@uniswap/v2-core/UniswapV2Factory');
const UniswapV2Pair = artifacts.require('@uniswap/v2-core/UniswapV2Pair');

const SunnyBunny = artifacts.require('SunnyBunny');
const SunnyBunnyUniswapLiquidity = artifacts.require('SunnyBunnyUniswapLiquidity');

contract('Sunny Bunny and Uniswap liquidity', function(accounts) {
  const ganache = new Ganache(web3);

  // todo - delete if not use anymore
  // afterEach('revert', ganache.revert);

  const bn = (input) => web3.utils.toBN(input);
  const assertBNequal = (bnOne, bnTwo) => assert.equal(bnOne.toString(), bnTwo.toString());

  // todo - delete if not use anymore
  const WETH = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2';
  const ROUTER02 = '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D';
  const UNISWAP_V2_FACTORY = '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f';

  const OWNER = accounts[0];
  const NOT_OWNER = accounts[1];
  const EXTRA_ADDRESS = accounts[2];
  const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
  const BASE_UNIT = bn('1000000000000000000');
  const TOKEN_AMOUNT = '1000000000000000000';

  let feeReceiver = accounts[3];
  let feePercent = 10;
  let sunnyBunnyToken;
  let sunnyBunnyUniswapLiquidity;

  let uniswapFactory;
  let uniswapRouter;
  let weth;
  let pair;
  let pairAddress;

  before('setup others', async function() {

    weth = WETH;

    // deploy and setup main contracts
    uniswapFactory = await UniswapV2Factory.new(OWNER);
    console.log('UniswapFactory = ' + uniswapFactory);

    sunnyBunnyToken = await SunnyBunny.new(feeReceiver, feePercent);
    console.log('sunnyBunnyToken = ' + sunnyBunnyToken);

    uniswapRouter = await UniswapV2Router02.new(uniswapFactory.address, weth);
    console.log('uniswapRouter = ' + uniswapRouter);

    sunnyBunnyUniswapLiquidity = await SunnyBunnyUniswapLiquidity.new(sunnyBunnyToken.address);
    console.log('sunnyBunnyUniswapLiquidity = ' + sunnyBunnyUniswapLiquidity);
    console.log('sunnyBunnyUniswapLiquidity.address = ' + sunnyBunnyUniswapLiquidity.address);

    //@author create a pair in the contract
    pair = await uniswapFactory.createPair(weth, sunnyBunnyToken.address);
    pairAddress = pair.tx;
    console.log('===========   pair   =============');
    console.log('pairAddress = ' + pairAddress);
    for(let index in pair) {
      console.log('index = ' + index);
      console.log('pairAddressToken = ' + pair[index]);
    }
    //console.log('UniswapV2Router02 = ' + UniswapV2Router02);

    // send ETH to cover tx fee
    //await send.ether(OWNER, NOT_OWNER, 1);

    //await sunnyBunnyToken.approve(uniswapRouter.address, TOKEN_AMOUNT, { from: OWNER });

    /**await sunnyBunnyToken.transferFrom(OWNER, sunnyBunnyUniswapLiquidity.address, TOKEN_AMOUNT);
    let balanceLiquid = await sunnyBunnyToken.balanceOf(sunnyBunnyUniswapLiquidity.address);
    console.log('balanceLiquid = ' + balanceLiquid);*/

    let res = await sunnyBunnyToken.approve(sunnyBunnyUniswapLiquidity.address, TOKEN_AMOUNT);
    console.log('===========   approve(sunnyBunnyUniswapLiquidity.address, TOKEN_AMOUNT)   =============');
    console.log('approved res = ' + res);
    for(let index in res) {
      console.log('index = ' + index);
      console.log('approved res = ' + res[index]);
    }

    //let approvedTokensToUniswapLiquid = await allowance(OWNER, sunnyBunnyUniswapLiquidity.address);
    //console.log('approvedTokensToUniswapLiquid = ' + approvedTokensToUniswapLiquid);

    let res2 = await sunnyBunnyToken.approve(ROUTER02, TOKEN_AMOUNT);
    console.log('===========   approve(ROUTER02, TOKEN_AMOUNT)  =============');
    console.log('approved res2 = ' + res2);
    for(let index in res2) {
      console.log('index = ' + index);
      console.log('approved res = ' + res2[index]);
    }
    //let approvedTokensToRouter = await allowance(OWNER, ROUTER02);
    //console.log('approvedTokensToRouter = ' + approvedTokensToRouter);
    //await sunnyBunnyToken.approve(ROUTER02, TOKEN_AMOUNT);
    //approvedTokensToRouter = await allowance(OWNER, ROUTER02);
    //console.log('approvedTokensToRouter = ' + approvedTokensToRouter);
    //await sunnyBunnyToken.approve(uniswapRouter.address, TOKEN_AMOUNT);

    let balance = await sunnyBunnyToken.balanceOf(NOT_OWNER);
    let balanceETH = await web3.eth.getBalance(NOT_OWNER);
    console.log('balance = ' + balance);
    console.log('balanceETH = ' + balanceETH);

    
    //console.log('UniswapV2Factory = ' + UniswapV2Factory);

  });

  describe('General tests', async () => {

    //Use liquidity from original Uniswap
    it('add liquidity', async () => {
      const tokensToLiquid = TOKEN_AMOUNT / 2;

      let tx = await uniswapRouter.addLiquidityETH(
        sunnyBunnyToken.address,
        bn(tokensToLiquid),
        0,
        0,
        OWNER,
        new Date().getTime() + 3000,
        //{from: NOT_OWNER, value: web3.utils.toWei('1', 'ether')}
        { value: web3.utils.toWei('1', 'ether') }
      );

      console.log('=== add liquidity ===');
      for (const log of tx.logs) {
        console.log(`${log.args.message} ${log.args.val}`);
      }
  });

  it('remove liquidity', async () => {
        const tokensToRemoveLiquid = TOKEN_AMOUNT / 20;
        let tx = await sunnyBunnyUniswapLiquidity.removeLiquid(
          bn(tokensToRemoveLiquid),
          sunnyBunnyToken.address,
          tokensToRemoveLiquid,
          1,
          1,
          OWNER,
          new Date().getTime() + 3000
        );
        console.log('=== remove liquidity ===');
        for (const log of tx.logs) {
          console.log(`${log.args.message} ${log.args.val}`);
        }
  });

  //todo if no need more, have to delete the file ./helpers/deployUniswap.js
  //const deployUniswap = require('./helpers/deployUniswap');

   // todo - delete if not use anymore
  /**  address public tokenUniswapPair;
    function createUniswapPair() public onlyOwner returns (address) {
        require(tokenUniswapPair == address(0), 'Token: pool already created');
        tokenUniswapPair = uniswapFactory.createPair(
            address(uniswapRouter.WETH()),
            address(this)
        );
        return tokenUniswapPair;
    }*/

     // todo - delete if not use anymore

    //const UniswapV2Factory = artifacts.require('IUniswapV2Factory');
    //const uniswapFactory = await UniswapFactory.deploy(OWNER);
    //const UniswapV2Router02 = artifacts.require('IUniswapV2Router02');
    //const IUniswapV2Pair = artifacts.require('IUniswapV2Pair');
    //const UniswapV2Pair = require('@uniswap/v2-core/build/UniswapV2Pair.json');
    //const UniswapV2Factory = require('@uniswap/v2-core/build/UniswapV2Factory.json');
    //const UniswapV2Router02 =  require('@uniswap/v2-periphery/build/UniswapV2Router02.json');
    //const WETH_JSON = require('@uniswap/v2-periphery/build/WETH9.json');
    //const { ethers } = require('ethers');

    /**const contracts = await deployUniswap(accounts);
    weth = await UniswapV2Router02.WETH();
    const WethFactory = new ethers.ContractFactory(WETH.abi, WETH.bytecode, OWNER);
    uniswapFactory = contracts.uniswapFactory;
    uniswapRouter = contracts.uniswapRouter;
    weth = contracts.weth;
    const WethFactory = new web3.eth.Contract(WETH_JSON.abi, WETH)
    const UniswapFactory = new web3.eth.Contract(UniswapV2Factory.abi, UNISWAP_V2_FACTORY);
    */

    //await SuBToken.createUniswapPair();
    //const sunnyBunnyTokenInstance = await sunnyBunnyToken.deployed();
    //const SuBToken = await sunnyBunnyToken.deploy(feeReceiver, feePercent);
    // SuBToken.deployed();
    //SunnyBunnyUniswapLiquidity = await SunnyBunnyUniswapLiquidity.new(SuBToken.address);
    //SunnyBunnyUniswapLiquidity = await SunnyBunnyUniswapLiquidity.deploy(SuBToken.address);
    //await SunnyBunnyUniswapLiquidity.deployed();
    //const sunnyBunnyToken = await sunnyBunnyToken.deploy(feeReceiver, feePercent);
    //await sunnyBunnyToken.deployed();
    //const sunnyBunnyUniswapLiquidity = await SunnyBunnyUniswapLiquidity.deploy(sunnyBunnyToken.address);
    //await sunnyBunnyUniswapLiquidity.deployed();

    //Use tokens from NOT_OWNER
    //await sunnyBunnyToken.transfer(NOT_OWNER, TOKEN_AMOUNT, { from: OWNER });
    //await sunnyBunnyToken.approve(sunnyBunnyUniswapLiquidity.address, TOKEN_AMOUNT, { from: NOT_OWNER });
    //await sunnyBunnyToken.approve(sunnyBunnyUniswapLiquidity.address, TOKEN_AMOUNT, { from: OWNER });
    //Use liquidity from SunnyBunnyUniswapLiquidity.sol

    /**it('add liquidity', async () => {
        const tokensToLiquid = TOKEN_AMOUNT / 2;
        let tx = await sunnyBunnyUniswapLiquidity.addLiquid(
          bn(tokensToLiquid),
          {from: NOT_OWNER, value: web3.utils.toWei('1', 'ether')}
          );

          console.log('=== add liquidity ===');
          for (const log of tx.logs) {
            console.log(`${log.args.message} ${log.args.val}`);
          }
    });

    it('remove liquidity', async () => {
          const tokensToRemoveLiquid = TOKEN_AMOUNT / 20;
          let tx = await sunnyBunnyUniswapLiquidity.removeLiquid(bn(tokensToRemoveLiquid), {from: NOT_OWNER});
          console.log('=== remove liquidity ===');
          for (const log of tx.logs) {
            console.log(`${log.args.message} ${log.args.val}`);
          }
    });
    */

  });

});

/** @author Address from doc https://uniswap.org/docs/v2/smart-contracts/router02/
address private constant ROUTER02 = 0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D;

 Address from doc https://uniswap.org/docs/v2/smart-contracts/factory/#address
 address private constant UNISWAPV2_FACTORY = 0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f;
*/

 /** @author Address WETH from doc to https://blog.0xproject.com/canonical-weth-a9aa7d0279dd
    * Mainnet: 0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2
    * Kovan: 0xd0a1e359811322d97991e03f863a0c30c2cf029c
    * Ropsten: 0xc778417e063141139fce010982780140aa0cd5ab
    * Rinkeby: 0xc778417e063141139fce010982780140aa0cd5ab
  */