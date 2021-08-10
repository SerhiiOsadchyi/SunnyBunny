const Ganache = require('./helpers/ganache');
//const deployUniswap = require('./helpers/deployUniswap');
const { send, expectEvent, expectRevert, constants } = require("@openzeppelin/test-helpers");

const SunnyBunny = artifacts.require('SunnyBunny');
const SunnyBunnyUniswapLiquidity = artifacts.require('SunnyBunnyUniswapLiquidity');
//const IUniswapV2Pair = artifacts.require('IUniswapV2Pair');

/** Address from doc https://uniswap.org/docs/v2/smart-contracts/router02/
address private constant ROUTER02 = 0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D;

 Address from doc https://uniswap.org/docs/v2/smart-contracts/factory/#address
 address private constant UNISWAPV2_FACTORY = 0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f;
*/

 /** @dev Address WETH from doc to https://blog.0xproject.com/canonical-weth-a9aa7d0279dd
    * Mainnet: 0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2
    * Kovan: 0xd0a1e359811322d97991e03f863a0c30c2cf029c
    * Ropsten: 0xc778417e063141139fce010982780140aa0cd5ab
    * Rinkeby: 0xc778417e063141139fce010982780140aa0cd5ab
    */

contract('Sunny Bunny token', function(accounts) {
  const ganache = new Ganache(web3);

  // todo - delete if not use anymore
  // afterEach('revert', ganache.revert);

  const bn = (input) => web3.utils.toBN(input);
  const assertBNequal = (bnOne, bnTwo) => assert.equal(bnOne.toString(), bnTwo.toString());

  const WETH = 0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2;
  const ROUTER02 = 0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D;
  const UNISWAPV2_FACTORY = 0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f;
  const OWNER = accounts[0];
  const NOT_OWNER = accounts[1];
  const EXTRA_ADDRESS = accounts[2];
  const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
  const BASE_UNIT = bn('1000000000000000000');
  const TOKEN_AMOUNT = BASE_UNIT;

  let feeReceiver = accounts[3];
  let feePercent = 10;
  let SuBToken;

  let uniswapPair;

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

    // deploy and setup main contracts

    sunnyBunnyToken = await SunnyBunny.new(feeReceiver, feePercent);
    sunnyBunnyUniswapLiquidity = await SunnyBunnyUniswapLiquidity.new(sunnyBunnyToken.address);

    // send ETH to cover tx fee
    await send.ether(OWNER, NOT_OWNER, 1);

    await sunnyBunnyToken.transfer(NOT_OWNER, TOKEN_AMOUNT, { from: OWNER });
    await sunnyBunnyToken.approve(sunnyBunnyUniswapLiquidity.address, TOKEN_AMOUNT, { from: NOT_OWNER });

  });

  describe('General tests', async () => {

    it('add liquidity', async () => {
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

  });

});