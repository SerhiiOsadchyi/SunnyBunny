// SPDX-License-Identifier: MIT

pragma solidity 0.8.6;

/**import {factorySuB} from "./SunnyBunny.sol"; не работает - дока здесь
* https://docs.soliditylang.org/en/v0.5.0/layout-of-source-files.html?highlight=import#import
*/

import "./SunnyBunny.sol";
import "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Factory.sol";
import "@uniswap/v2-periphery/contracts/UniswapV2Router02.sol";
import "@uniswap/v2-periphery/contracts/UniswapV2Router01.sol";
import "@uniswap/v2-core/contracts/UniswapV2Factory.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import '@uniswap/v2-periphery/contracts/interfaces/IWETH.sol';

contract SunnyBunnyUniswapLiquidity is Ownable {

    SunnyBunny immutable tokenSuB;
    event Received(address, uint);
    event Log(string message, uint vol);

    /** @dev Address from doc https://uniswap.org/docs/v2/smart-contracts/factory/#address */
    address private constant UNISWAPV2_FACTORY = 0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f;

    /** @dev Address from doc https://uniswap.org/docs/v2/smart-contracts/router02/ */
    address private constant ROUTER02 = 0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D;

    /** @dev Address WETH from doc to https://blog.0xproject.com/canonical-weth-a9aa7d0279dd
    * Mainnet: 0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2
    * Kovan: 0xd0a1e359811322d97991e03f863a0c30c2cf029c
    * Ropsten: 0xc778417e063141139fce010982780140aa0cd5ab
    * Rinkeby: 0xc778417e063141139fce010982780140aa0cd5ab
    */
    address public immutable override WETH;

    constructor(address token, address _WETH) {
        tokenSuB = SunnyBunny(token);
        WETH = _WETH;
    }

    /// @author почему не работает так?
    /**IUniswapV2Router02 iuniswapRouter
    *...
    *constructor(){
    *    ...
    *}
    * iuniswapRouter2 = IUniswapV2Router02(iuniswapRouter2)
    */

    IUniswapV2Router02 iuniswapRouter2 = IUniswapV2Router02(iuniswapRouter2);
    IUniswapV2Factory iuniswapFactory = iuniswapFactory(iuniswapRouter);

    function addLiquidity(
        uint _amountTokenDesired,
        uint _amountTokenMin,
        uint _amountETHMin
    ) external payable onlyOwner {
        (uint amountToken, uint amountETH, uint liquidity) = iuniswapRouter2(ROUTER02).addLiquidityETH(
            tokenSuB,
            _amountTokenDesired,
            _amountTokenMin,
            _amountETHMin,
            address(this),
            block.timestamp
        );

        emit Log("amount token  = ", amountToken);
        emit Log("amount ETH  = ", amountETH);
        emit Log("amount liquidity", liquidity);

    }

    function removeLiquidity(
        uint _amountTokenMin,
        uint _amountETHMin,
        address _to
    ) external payable onlyOwner {
        /** @dev check address WETH before deploy*/
        address pair = iuniswapFactory(UNISWAPV2_FACTORY).getPair(tokenSuB, WETH);

        uint liquidity = IERC20(pair).balanceOf(address(this));

        (uint amountToken, uint amountETH) = removeLiquidityETH(
            tokenSuB,
            liquidity,
            _amountTokenMin,
            _amountETHMin,
            address(this),
            block.timestamp
        );

        emit Log("amount token  = ", amountToken);
        emit Log("amount ETH  = ", amountETH);

    }

    // **** SWAP ****
    // requires the initial amount to have already been sent to the first pair

    //todo make sure:  **** Swap for SuB/ETH pair ****

    //todo make sure: sell tokens at a maximum price
    function swapExactETHForTokens(uint _amountOutMin) public payable {
        address pair = iuniswapFactory(UNISWAPV2_FACTORY).getPair(tokenSuB, WETH);

        (address factory, uint amountOut, address path) =
            iuniswapRouter2(ROUTER02).swapExactETHForTokens(_amountOutMin, pair, address(this), block.timestamp);

        emit Log("amount out token  = ", amountOut);
    }

    //todo make sure: buy tokens at a minimum price
     function swapTokensForExactETH(uint _amountOut, uint _amountInMax) public payable {
        address pair = iuniswapFactory(UNISWAPV2_FACTORY).getPair(tokenSuB, WETH);

        (address factory, uint amountOut, address path) =
            iuniswapRouter2(ROUTER02).swapTokensForExactETH(_amountOut, _amountInMax, pair, address(this), block.timestamp);

        emit Log("amount out token  = ", amountOut);
    }

    //todo make sure:  **** Swap for ETH/SuB pair ****

    //todo make sure: sell tokens at maximum price
     function swapExactTokensForETH(uint _amountIn, uint _amountOutMin) public payable {
        address pair = iuniswapFactory(UNISWAPV2_FACTORY).getPair(tokenSuB, WETH);

        (address factory, uint amountOut, address path) =
            iuniswapRouter2(ROUTER02).swapExactTokensForETH(_amountIn, _amountOutMin, pair, address(this), block.timestamp);

        emit Log("amount out token  = ", amountOut);
    }

    //todo make sure: buy tokens at market price
     function swapETHForExactTokens(uint _amountOut) public payable {
        address pair = iuniswapFactory(UNISWAPV2_FACTORY).getPair(tokenSuB, WETH);

        (address factory, uint amountOut, address path) =
            iuniswapRouter2(ROUTER02).swapETHForExactTokens(_amountOut, pair, address(this), block.timestamp);

        emit Log("amount out token  = ", amountOut);
    }



/** todo remove if no need
    receive() external payable {
        emit Received(msg.sender, msg.value);
    }
*/

/** todo try variable with a set value */
    //address res = _feeReciever;
    //address res = SunnyBunny(_feeReciever);
    //address res = SunnyBunny._feeReciever;
    //address res = tokenSuB(_feeReciever);
    //address res = tokenSuB._feeReciever;
}