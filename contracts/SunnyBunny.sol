// SPDX-License-Identifier: MIT

/// @author - можно такую версию pragma использовать?
pragma solidity 0.8.6;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract SunnyBunny is ERC20, Ownable{
    using SafeMath for uint256;

    string public _name = "Sunny Bunny";
    string public _symbol = "SuB";
    uint8 private _feePercent;

    address internal _feeReciever;

    constructor(address feeReciever, uint8 feePercent) ERC20(_name, _symbol) {
        _mint(msg.sender, 7e5 * 1e18);
        _feeReciever = feeReciever;
        _feePercent = feePercent;
    }

    modifier checkAddressIs0(address recipient) {
        require(recipient != address(0), "Tokens couldn't be transfer to a zero address");
        _;
    }

    function setReciever(address feeReciever) public checkAddressIs0(feeReciever) onlyOwner {
        _feeReciever = feeReciever;
    }

    // A fee could not be bigger than 15%
    function setFeePercent(uint8 feePercent) public onlyOwner {
        require(15 >= feePercent, "A fee might to be set to 15% or less");
        _feePercent = feePercent;
    }

    function transferWithFee(address recipient, uint256 amount) public checkAddressIs0(recipient) returns (uint256) {
        (uint256 absoluteFee, uint256 amountWithFee) = calculateFee(amount);

        // transfer tokens to a recipient
        transfer(recipient, amount);
        emit Transfer(msg.sender, recipient, amount);

        // transfer a fee to a fee's reciever
        return tranferFeeToReciever(absoluteFee);
    }

    function calculateFee (uint256 amount) view internal returns (uint256, uint256){
        uint256 absoluteFee = amount.mul(_feePercent).div(100);
        uint256 amountWithFee = amount.add(absoluteFee);
        return (absoluteFee, amountWithFee);
    }

    // tranfer fee's tokens to a fee's reciever from token's owner
    function tranferFeeToReciever(uint256 feeAmount) public {
        transferFrom(owner(), _feeReciever, feeAmount);
    }

}