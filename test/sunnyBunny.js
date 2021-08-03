const Ganache = require('./helpers/ganache');
//const deployUniswap = require('./helpers/deployUniswap');
const { expectEvent, expectRevert, constants } = require("@openzeppelin/test-helpers");

const SunnyBunny = artifacts.require('SunnyBunny');

contract('Sunny Bunny token', function(accounts) {
  const ganache = new Ganache(web3);

  // todo - delete if not use anymore
  // afterEach('revert', ganache.revert);

  // todo - delete if not use anymore
  const bn = (input) => web3.utils.toBN(input); // not use
  const assertBNequal = (bnOne, bnTwo) => assert.equal(bnOne.toString(), bnTwo.toString());

  const OWNER = accounts[0];
  const NOT_OWNER = accounts[1];
  const EXTRA_ADDRESS = accounts[2];
  const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

  // todo - delete if not use anymore
  const baseUnit = bn('1000000000000000000'); // not use

  let feeReceiver = accounts[3];
  let feePercent = 10;
  let sunnyBunnyToken;

  before('setup others', async function() {
    // deploy and setup main contracts
    sunnyBunnyToken = await SunnyBunny.new(feeReceiver, feePercent);
  });

  describe('General tests', async () => {

    it('should be not possible to change a receiver\'s address from non-owner', async () => {
      await expectRevert(
        sunnyBunnyToken.setReceiver(EXTRA_ADDRESS, { from: NOT_OWNER }),
        'Ownable: caller is not the owner'
      );
    });

    it('should be transfer tokens from owner to an any address without fee', async () => {
      const amount = 10000; // fee is 10%
      await sunnyBunnyToken.transfer(NOT_OWNER, amount);

       // todo - may be to change in assert.equal
      assertBNequal(await sunnyBunnyToken.balanceOf(NOT_OWNER), amount);
      assertBNequal(await sunnyBunnyToken.balanceOf(feeReceiver), 0);
    });

    it('should be transfer tokens from non-owner to an any address with fee', async () => {
      const amount = 1000; // fee is 10%
      await sunnyBunnyToken.transfer(EXTRA_ADDRESS, amount,  { from: NOT_OWNER });

      assert.equal(await sunnyBunnyToken.balanceOf(NOT_OWNER), 8900); // 10000 - (1000 + 10%)
      assert.equal(await sunnyBunnyToken.balanceOf(feeReceiver), 100);
      assert.equal(await sunnyBunnyToken.balanceOf(EXTRA_ADDRESS), 1000);

    });

    it('should be possible to change a receiver\'s address from owner', async () => {
      await sunnyBunnyToken.setReceiver(EXTRA_ADDRESS);
      assert.equal(await sunnyBunnyToken.getFeeReceiver(), EXTRA_ADDRESS);
    });

    it('should not be possible to change a receiver\'s address to zero', async () => {
      await expectRevert(
        sunnyBunnyToken.setReceiver(ZERO_ADDRESS),
        'Receiver\'s address couldn\'t be set to zero'
      );
    });

    it('shouldn\'t be possible to change a fee percent by non-owner', async () => {
      let newFeePercent = 8;
      await expectRevert(
        sunnyBunnyToken.setFeePercent(newFeePercent,  { from: NOT_OWNER }),
        'Ownable: caller is not the owner'
      );
    });

    it('shouldn\'t be possible to change a fee percent more than 15%', async () => {
      let newFeePercent = 16;
      await expectRevert(
        sunnyBunnyToken.setFeePercent(newFeePercent),
        'A fee might to be set to 15% or less'
      );
    });

    it('should be possible to change a fee percent by owner', async () => {
      let newFeePercent = 15;
      await sunnyBunnyToken.setFeePercent(newFeePercent);
      assert.equal(await sunnyBunnyToken.getFeePercent(), newFeePercent);
    });

  });

});
