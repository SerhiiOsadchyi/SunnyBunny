// SPDX-License-Identifier: MIT

pragma solidity >=0.6.2 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract SunnyBunny is ERC20 {
    using SafeMath for uint256;

    mapping(address => uint256) private _balances;

    uint256 private _totalSupply;
    string public _name = "Sunny Bunny";
    string public _symbol = "SuB";
    uint8 private _decimals;
    uint8 private _feePercent;

    address payable internal _feeReciever;
    address payable internal owner;

    constructor(address payable feeReciever, uint8 feePercent) ERC20(_name, _symbol) {
        _totalSupply = 7e5 * 1e18;
        _decimals = 18;
        _balances[msg.sender] = _totalSupply;
        // todo _mint(msg.sender, _totalSupply);
        _feeReciever = feeReciever;
        _feePercent = feePercent;
        owner = payable(msg.sender);
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner could call this");
        _;
    }

    modifier checkAddressIs0(address recipient) {
        require(recipient != address(0), "Tokens couldn't be transfer to a zero address");
        _;
    }

    function setReciever(address payable feeReciever) public checkAddressIs0(feeReciever) onlyOwner {
        _feeReciever = feeReciever;
    }

    // A fee could not be bigger than 15%
    function setFeePercent(uint8 feePercent) public onlyOwner {
        require(15 >= feePercent, "A fee might to be set to 15% or less");
        _feePercent = feePercent;
    }

    function transferWithFee(address recipient, uint256 amount) public payable checkAddressIs0(recipient) returns (bool) {
        (uint256 absoluteFee, uint256 amountWithFee) = calculateFee(amount);

        // transfer tokens to a recipient
        transfer(recipient, amount);
        _balances[recipient] += amount;
        _balances[msg.sender] -= amountWithFee;
        emit Transfer(msg.sender, recipient, amount);

        // transfer a fee to a fee's reciever
        tranferFeeToReciever(absoluteFee);

        return true;
    }

    function calculateFee (uint256 amount) view internal returns (uint256, uint256){
        uint256 absoluteFee = amount.mul(_feePercent).div(100);
        uint256 amountWithFee = amount.add(absoluteFee);
        return (absoluteFee, amountWithFee);
    }

    // tranfer fee's tokens to a fee's reciever from token's owner
    function tranferFeeToReciever(uint256 feeAmount) internal {
        transferFrom(owner,_feeReciever, feeAmount);
        _balances[_feeReciever] = _balances[_feeReciever].add(feeAmount);
    }
}