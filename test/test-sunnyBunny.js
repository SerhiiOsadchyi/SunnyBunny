const Ganache = require('./helpers/ganache');
const { expectEvent, expectRevert, constants } = require("@openzeppelin/test-helpers");
const truffleAssert = require('truffle-assertions');

const SunnyBunny = artifacts.require('SunnyBunny');

contract('Sunny Bunny token', function(accounts) {
  const ganache = new Ganache(web3);

  // TODO - delete if not use anymore
  // afterEach('revert', ganache.revert);

  const bn = (input) => web3.utils.toBN(input);
  const assertBNequal = (bnOne, bnTwo, error = '') => assert.equal(bnOne.toString(), bnTwo.toString(), error);

  const OWNER = accounts[0];
  const NOT_OWNER = accounts[1];
  const EXTRA_ADDRESS = accounts[2];
  const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
  const baseUnit = bn('1000000000000000000');

  const addressFactory = '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f'; // any value - it not use in this test
  const addressRouter = '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D'; // any value - it not use in this test

  let feeReceiver = accounts[3];
  let feePercent = 7;
  let sunnyBunnyToken;

  before('setup others', async function() {
    // deploy and setup main contracts
    sunnyBunnyToken = await SunnyBunny.new(feeReceiver, feePercent, addressRouter, addressFactory);
    console.log('OWNER address = ' + OWNER);
    console.log('NOT_OWNER address = ' + NOT_OWNER);
    console.log('EXTRA_ADDRESS address = ' + EXTRA_ADDRESS);
  });

  describe('General tests', async () => {

    it('should be not possible to change a receiver\'s address from non-owner', async () => {
      await expectRevert(
        sunnyBunnyToken.setReceiver(EXTRA_ADDRESS, { from: NOT_OWNER }),
        'Ownable: caller is not the owner'
      );
    });

    it('should be transfer tokens from owner to an any address without fee', async () => {
      const amount = bn('100').mul(baseUnit) ; // 100 tokens, fee is 10%
      let eventLogs = await sunnyBunnyToken.transferWithFee(NOT_OWNER, amount);
      truffleAssert.prettyPrintEmittedEvents(eventLogs);

      const notOwnerBalance = await sunnyBunnyToken.balanceOf(NOT_OWNER);
      const feeReceiverBalance = await sunnyBunnyToken.balanceOf(feeReceiver);

      assertBNequal(bn(notOwnerBalance), amount);
      assertBNequal(bn(feeReceiverBalance), 0);
    });

    it('success transferFrom tokens approved from owner (without fee)', async () => {
      const amount = bn('500').mul(baseUnit); // 500 tokens, fee is 0%

      const notOwnerBalanceBeforeSend = await sunnyBunnyToken.balanceOf(NOT_OWNER);
      console.log('transferFrom balance NOT_OWNER Before Send = ' + notOwnerBalanceBeforeSend);

      await sunnyBunnyToken.approve(EXTRA_ADDRESS, bn(amount));
      await sunnyBunnyToken.transferFromWithFee(OWNER, NOT_OWNER, amount, { from: EXTRA_ADDRESS });

      const notOwnerBalanceAfterSend = await sunnyBunnyToken.balanceOf(NOT_OWNER);
      console.log('transferFrom balance NOT_OWNER After Send = ' + notOwnerBalanceAfterSend);
      const feeReceiverBalance = await sunnyBunnyToken.balanceOf(feeReceiver);

      assertBNequal(bn(notOwnerBalanceAfterSend).sub(notOwnerBalanceBeforeSend), bn(amount));
      assertBNequal(bn(feeReceiverBalance), 0);
    });

    it('success transferFrom tokens with fee (approved from not owner)', async () => {
      //NOT_OWNER - token's owner; EXTRA_ADDRESS - sender; OWNER - new token's owner
      console.log('=============    transferFrom tokens with fee    ================ ');

      const amount = bn('50').mul(baseUnit); // 50 tokens, fee is 10%
      const amountFee = bn(amount).mul(bn(feePercent)).div(bn('100'));
      const amountWithFee = bn(amount).add(amountFee);
      console.log('amountFee = ' + amountFee);
      console.log('amountWithFee = ' + amountWithFee);

      const notOwnerBalanceBeforeSend = await sunnyBunnyToken.balanceOf(NOT_OWNER);
      const ownerBalanceBeforeSend = await sunnyBunnyToken.balanceOf(OWNER);
      console.log('transferFrom balance NOT_OWNER Before Send = ' + notOwnerBalanceBeforeSend);

      await sunnyBunnyToken.approve(EXTRA_ADDRESS, bn(amountWithFee), { from: NOT_OWNER } );
      await sunnyBunnyToken.transferFromWithFee(NOT_OWNER, OWNER, amount, { from: EXTRA_ADDRESS });

      const notOwnerBalanceAfterSend = await sunnyBunnyToken.balanceOf(NOT_OWNER);
      const ownerBalanceAfterSend = await sunnyBunnyToken.balanceOf(OWNER);
      console.log('transferFrom balance NOT_OWNER After Send = ' + notOwnerBalanceAfterSend);

      const feeReceiverBalance = await sunnyBunnyToken.balanceOf(feeReceiver);
      console.log('transferFrom balance feeReceiver After Send = ' + feeReceiverBalance);

      assertBNequal(bn(notOwnerBalanceBeforeSend).sub(notOwnerBalanceAfterSend), bn(amountWithFee));
      assertBNequal(bn(ownerBalanceAfterSend).sub(ownerBalanceBeforeSend), bn(amount));
      assertBNequal(bn(feeReceiverBalance), amountFee);
    });

    it('should be transfer tokens from non-owner to an any address with fee', async () => {
      console.log('=============    transfer tokens with fee    ================ ');

      const amount = bn('10').mul(baseUnit); // 10 tokens
      const amountFee = bn(amount).mul(bn(feePercent)).div(bn('100')); // fee is 7%
      const amountWithFee = bn(amount).add(bn(amountFee)); // fee is 7%
      console.log('amountWithFee = ' + amountWithFee);

       // Balances before a transaction
      const notOwnerBalanceBeforeSend = await sunnyBunnyToken.balanceOf(NOT_OWNER);
      console.log('transferFrom balance NOT_OWNER Before Send = ' + notOwnerBalanceBeforeSend);
      const feeReceiverBalanceBeforeSend = await sunnyBunnyToken.balanceOf(feeReceiver);
      const extraAddressBeforeSend = await sunnyBunnyToken.balanceOf(EXTRA_ADDRESS);

      let eventLogs = await sunnyBunnyToken.transferWithFee(EXTRA_ADDRESS, bn(amount),  { from: NOT_OWNER });
      truffleAssert.prettyPrintEmittedEvents(eventLogs);

      // Balances after a transaction
      const notOwnerBalanceAfterSend = await sunnyBunnyToken.balanceOf(NOT_OWNER);
      console.log('transferFrom balance NOT_OWNER After Send = ' + notOwnerBalanceAfterSend);
      const feeReceiverBalanceAfterSend = await sunnyBunnyToken.balanceOf(feeReceiver);
      const extraAddressBalanceAfterSend = await sunnyBunnyToken.balanceOf(EXTRA_ADDRESS);

      // TODO uncomment strings below for see events
      //let tx = fdfsd

      assertBNequal(
          bn(notOwnerBalanceBeforeSend).sub(notOwnerBalanceAfterSend), 
          amountWithFee,
          'Wrong balance at NOT_OWNER'
        );
      assertBNequal(
          bn(feeReceiverBalanceAfterSend).sub(feeReceiverBalanceBeforeSend), 
          amountFee,
          'Wrong balance at fee Receiver'
        );
      assertBNequal(
          bn(extraAddressBalanceAfterSend).sub(extraAddressBeforeSend), 
          amount,
          'Wrong balance at extra Address'
        );

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