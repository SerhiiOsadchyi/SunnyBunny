const Ganache = require('./helpers/ganache');

//todo if no need more, have to delete the file ./helpers/deployUniswap.js
const deployUniswap = require('./helpers/deployUniswap');

const { send, expectEvent, expectRevert, constants } = require("@openzeppelin/test-helpers");

const SunnyBunny = artifacts.require('SunnyBunny');
const SunnyBunnyUniswapLiquidity = artifacts.require('SunnyBunnyUniswapLiquidity');

// todo - delete if not use anymore
//const IUniswapV2Pair = artifacts.require('IUniswapV2Pair');

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

contract('Sunny Bunny and Uniswap liquidity', function(accounts) {
  const ganache = new Ganache(web3);

  // todo - delete if not use anymore
  // afterEach('revert', ganache.revert);

  const bn = (input) => web3.utils.toBN(input);
  const assertBNequal = (bnOne, bnTwo) => assert.equal(bnOne.toString(), bnTwo.toString());

  // todo - delete if not use anymore
  //const WETH = 0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2;
  //const ROUTER02 = 0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D;
  //const UNISWAPV2_FACTORY = 0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f;

  const OWNER = accounts[0];
  const NOT_OWNER = accounts[1];
  const EXTRA_ADDRESS = accounts[2];
  const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
  const BASE_UNIT = bn('1000000000000000000');
  const TOKEN_AMOUNT = BASE_UNIT;

  let feeReceiver = accounts[3];
  let feePercent = 10;
  let SuBToken;

  let uniswapFactory;
  let uniswapRouter;
  let weth;
  let uniswapPair;
  let pairAddress;

  // todo - delete if not use anymore
 /**  address public tokenUniswapPair;
    function createUniswapPair() public onlyOwner returns (address) {
        require(tokenUniswapPair == address(0), "Token: pool already created");
        tokenUniswapPair = uniswapFactory.createPair(
            address(uniswapRouter.WETH()),
            address(this)
        );
        return tokenUniswapPair;
    }*/

  before('setup others', async function() {
    // todo - delete if not use anymore
    //await SuBToken.createUniswapPair();
    //const sunnyBunnyTokenInstance = await sunnyBunnyToken.deployed();
    //const SuBToken = await sunnyBunnyToken.deploy(feeReceiver, feePercent);
    // SuBToken.deployed();
    //SunnyBunnyUniswapLiquidity = await SunnyBunnyUniswapLiquidity.new(SuBToken.address);
    //SunnyBunnyUniswapLiquidity = await SunnyBunnyUniswapLiquidity.deploy(SuBToken.address);
    //await SunnyBunnyUniswapLiquidity.deployed();

    const contracts = await deployUniswap(accounts);
    uniswapFactory = contracts.uniswapFactory;
    uniswapRouter = contracts.uniswapRouter;
    weth = contracts.weth;

    // deploy and setup main contracts

    //sunnyBunnyToken = await SunnyBunny.new(feeReceiver, feePercent);
    const sunnyBunnyToken = await sunnyBunnyToken.deploy(feeReceiver, feePercent);
    await sunnyBunnyToken.deployed();
    console.log("sunnyBunnyToken = " + sunnyBunnyToken);

    //sunnyBunnyUniswapLiquidity = await SunnyBunnyUniswapLiquidity.new(sunnyBunnyToken.address);
    const sunnyBunnyUniswapLiquidity = await SunnyBunnyUniswapLiquidity.deploy(sunnyBunnyToken.address);
    await sunnyBunnyUniswapLiquidity.deployed();
    console.log("sunnyBunnyUniswapLiquidity = " + sunnyBunnyUniswapLiquidity);

    // send ETH to cover tx fee
    //await send.ether(OWNER, NOT_OWNER, 1);

    await sunnyBunnyToken.transfer(NOT_OWNER, TOKEN_AMOUNT, { from: OWNER });
    await sunnyBunnyToken.approve(sunnyBunnyUniswapLiquidity.address, TOKEN_AMOUNT, { from: NOT_OWNER });

    let balance = await sunnyBunnyToken.balanceOf(NOT_OWNER);
    let balanceETH = await web3.eth.getBalance(NOT_OWNER);
    console.log("balance = " + balance);
    console.log("balanceETH = " + balanceETH);

    //todo try to create a pair in the contract
    await uniswapFactory.createPair(weth.address, sunnyBunnyToken.address);
    pairAddress = await uniswapFactory.getPair(weth.address, sunnyBunnyToken.address);
    uniswapPair = await ethers.getContractAt(UniswapV2Pair.abi, pairAddress);

  });

  describe('General tests', async () => {

    //Use liquidity from original Uniswap
    it('add liquidity', async () => {
      const tokensToLiquid = TOKEN_AMOUNT / 2;

      let tx = await uniswapRouter.addLiquidityETH(
        sunnyBunnyUniswapLiquidity.address,
        tokensToLiquid,
        0,
        0,
        OWNER,
        new Date().getTime() + 3000,
        {from: NOT_OWNER, value: web3.utils.toWei('1', "ether")}
      );

      console.log("=== add liquidity ===");
      for (const log of tx.logs) {
        console.log(`${log.args.message} ${log.args.val}`);
      }
  });

  it('remove liquidity', async () => {
        const tokensToRemoveLiquid = TOKEN_AMOUNT / 20;
        let tx = await sunnyBunnyUniswapLiquidity.removeLiquid(bn(tokensToRemoveLiquid), {from: NOT_OWNER});
        console.log("=== remove liquidity ===");
        for (const log of tx.logs) {
          console.log(`${log.args.message} ${log.args.val}`);
        }
  });


    //Use liquidity from SunnyBunnyUniswapLiquidity.sol
    /**it('add liquidity', async () => {
        const tokensToLiquid = TOKEN_AMOUNT / 2;
        let tx = await sunnyBunnyUniswapLiquidity.addLiquid(
          bn(tokensToLiquid),
          {from: NOT_OWNER, value: web3.utils.toWei('1', "ether")}
          );

          console.log("=== add liquidity ===");
          for (const log of tx.logs) {
            console.log(`${log.args.message} ${log.args.val}`);
          }
    });

    it('remove liquidity', async () => {
          const tokensToRemoveLiquid = TOKEN_AMOUNT / 20;
          let tx = await sunnyBunnyUniswapLiquidity.removeLiquid(bn(tokensToRemoveLiquid), {from: NOT_OWNER});
          console.log("=== remove liquidity ===");
          for (const log of tx.logs) {
            console.log(`${log.args.message} ${log.args.val}`);
          }
    });
    */

  });

});