// SPDX-License-Identifier: MIT

pragma solidity >=0.6.2 <0.9.0;

/**import {factorySuB} from "./SunnyBunny.sol"; не работает - дока здесь
* https://docs.soliditylang.org/en/v0.5.0/layout-of-source-files.html?highlight=import#import
*/

import "./SunnyBunny.sol";
import "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";
import "@uniswap/v2-periphery/contracts/interfaces/IWETH.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol";

contract SunnyBunnyUniswapLiquidity {

    SunnyBunny public tokenSuB;

    IUniswapV2Pair iuniswapPair;
    IWETH iweth;

    /** @dev Address from doc https://uniswap.org/docs/v2/smart-contracts/factory/#address */
    address private constant UniswapV2Factory = 0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f;

    /** @dev Address from doc https://uniswap.org/docs/v2/smart-contracts/router02/ */
    address private constant ROUTER02 = 0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D;

    /** @dev Address from doc to https://blog.0xproject.com/canonical-weth-a9aa7d0279dd
    * Mainnet: 0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2
    * Kovan: 0xd0a1e359811322d97991e03f863a0c30c2cf029c
    * Ropsten: 0xc778417e063141139fce010982780140aa0cd5ab
    * Rinkeby: 0xc778417e063141139fce010982780140aa0cd5ab
    */
    address private constant WETH = 0xc778417E063141139Fce010982780140Aa0cD5Ab;

    address payable internal owner;

    constructor(address token){
        tokenSuB = SunnyBunny(token);
        owner = payable(msg.sender);
    }

    IUniswapV2Router02 iuniswapRouter = IUniswapV2Router02(iuniswapRouter);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner could call this");
        _;
    }
    event Log(string message, uint vol);

    function addPair() public returns(address) {

    }

    function addLiquidity(
        address _token,
        uint _amountTokenDesired,
        uint _amountTokenMin,
        uint _amountETHMin) external {
        (uint amountToken, uint amountETH, uint liquidity) = iuniswapRouter(ROUTER02).addLiquidityETH(
        _token,
        _amountTokenDesired,
        _amountTokenMin,
        _amountETHMin,
        address(this),
        block.timestamp
      );

        emit Log("amount token", amountToken);
        emit Log("amount ETH", amountETH);
        emit Log("amount liquidity", liquidity);
        //emit Log("amount liquidity", liqui);

    }

    /** todo remove if no need
    function getEther(uint amount) payable public {
        require(msg.value == amount, "ETH value not equal an amount needed");
    }

    function addLiquidity(uint amountSuB, uint amountETH) external onlyOwner {

        tokenSuB.transfer(address(this), amountSuB);
        getEther(amountETH);

        tokenSuB.approve(ROUTER02, amountSuB);
        IERC20(WETH).approve(ROUTER02, amountETH);

        //IUniswapV2Router02.addLiquidityETH
    }
    */

    /** todo try variable with a set value */

    //address res = _feeReciever;
    //address res = SunnyBunny(_feeReciever);
    //address res = SunnyBunny._feeReciever;
    //address res = tokenSuB(_feeReciever);
    //address res = tokenSuB._feeReciever;
}