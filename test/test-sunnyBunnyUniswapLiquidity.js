const Ganache = require('./helpers/ganache');
const deployUniswap = require('./helpers/deployUniswap');
const { send, expectEvent, expectRevert, constants } = require("@openzeppelin/test-helpers");

const SunnyBunny = artifacts.require('SunnyBunny');
const SunnyBunnyUniswapLiquidity = artifacts.require('SunnyBunnyUniswapLiquidity ');
const IUniswapV2Pair = artifacts.require('IUniswapV2Pair');

contract('Sunny Bunny token', function(accounts) {
  const ganache = new Ganache(web3);

  // todo - delete if not use anymore
  // afterEach('revert', ganache.revert);

  const bn = (input) => web3.utils.toBN(input);
  const assertBNequal = (bnOne, bnTwo) => assert.equal(bnOne.toString(), bnTwo.toString());

  const OWNER = accounts[0];
  const NOT_OWNER = accounts[1];
  const EXTRA_ADDRESS = accounts[2];
  const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
  const baseUnit = bn('1000000000000000000');
  const TOKEN_AMOUNT = pow(10, 18);

  let feeReceiver = accounts[3];
  let feePercent = 10;
  let sunnyBunnyToken;

  let uniswapPair;
  let uniswapFactory;
  let uniswapRouter;
  let weth;

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
    const contracts = await deployUniswap(accounts);
    uniswapFactory = contracts.uniswapFactory;
    uniswapRouter = contracts.uniswapRouter;
    weth = contracts.weth;

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
    SunnyBunnyUniswapLiquidity = await SunnyBunnyUniswapLiquidity.new(SuBToken.address);

    // send ETH to cover tx fee
    await send.ether(OWNER, NOT_OWNER, 1);

    await SuBToken.transfer(NOT_OWNER, TOKEN_AMOUNT, { from: OWNER });
    await SuBToken.approve(SunnyBunnyUniswapLiquidity.address, TOKEN_A_AMOUNT, { from: NOT_OWNER });

  });

  describe('General tests', async () => {

    it('add liquidity and remove liquidity', async () => {
        const tokensToLiquid = TOKEN_AMOUNT / 2;
        let tx = await SunnyBunnyUniswapLiquidity.addLiquid(tokensToLiquid, {from: NOT_OWNER, value: web3.toWei(1, "ether")});
          console.log("=== add liquidity ===");
          for (const log of tx.logs) {
            console.log(`${log.args.message} ${log.args.val}`);
          }

          const tokensToRemoveLiquid = TOKEN_AMOUNT / 20;
          tx = await contract.removeLiquidity(tokensToRemoveLiquid, {from: NOT_OWNER});
          console.log("=== remove liquidity ===");
          for (const log of tx.logs) {
            console.log(`${log.args.message} ${log.args.val}`);
          }
    });

  });

});