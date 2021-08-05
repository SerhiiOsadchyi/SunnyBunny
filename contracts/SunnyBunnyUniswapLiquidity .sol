// SPDX-License-Identifier: MIT

pragma solidity 0.8.0;

/**import {factorySuB} from "./SunnyBunny.sol"; не работает - дока здесь
* https://docs.soliditylang.org/en/v0.5.0/layout-of-source-files.html?highlight=import#import
*/

import "./SunnyBunny.sol";
import "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Factory.sol";
//import "@uniswap/v2-core/contracts/UniswapV2Factory.sol";

contract SunnyBunnyUniswapLiquidity is Ownable {

    SunnyBunny immutable tokenSuB; //could be change once
    event Received(address, uint);
    event Log(string message, uint vol);

    IUniswapV2Router02 private uniswapV2Router;
    IUniswapV2Factory private uniswapV2Factory;
    //IUniswapV2Pair private tokenPair;
    address public tokenAddress;

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

    constructor(address _tokenAddress) {
        tokenSuB = SunnyBunny(_tokenAddress);
        tokenAddress = _tokenAddress;
    }

    // get address of Token pair Uniswap V2 LP
    address weth = uniswapV2Router.WETH();
    address pair = uniswapV2Factory.getPair(tokenAddress, weth);

    function addLiquidity(uint _amountToken) external payable onlyOwner {

        //ERC20(tokenAddress).transferFrom(msg.sender, address(this), _amountToken);

        (uint amountToken, uint amountETH, uint liquidity) = uniswapV2Router.addLiquidityETH{value: msg.value}(
            tokenAddress,
            _amountToken,
            0, // for change add _amountTokenMin like argument for this function and parent addLiquidity()
            0, // for change add _amountETHMin to argument for this function and parent addLiquidity()
            address(this),
            block.timestamp
        );

        emit Log("amount token  = ", amountToken);
        emit Log("amount ETH  = ", amountETH);
        emit Log("amount liquidity  = ", liquidity);

    }

    function removeETHLiquidity(uint _liquidity) external onlyOwner {
        require(IERC20(pair).balanceOf(address(this)) >= _liquidity, "Liquidity is not enough");

        uniswapV2Router.removeLiquidityETHSupportingFeeOnTransferTokens(
            pair,
            _liquidity,
            0, // for change add _amountTokenMin like argument for this function
                //and parent removeETHLiquidityFromToken()
            0, // for change add _amountETHMin to argument for this function
            address(this), // for change add address _to like argument for this function
                            //and parent removeETHLiquidityFromToken()
            block.timestamp + 20
        );

    }

    // **** SWAP ****
    // requires the initial amount to have already been sent to the first pair

    //todo make sure:  **** Swap for SuB/ETH pair ****

    //todo make sure: sell tokens at a maximum price
    function swapExactETHForTokens(uint _amountOutMin) public payable {
        address[] memory path = new address[](2);
        path[0] = weth;
        path[1] = tokenAddress;

        /**@author use swapExactETHForTokens for token without fee */
        uniswapV2Router.swapExactETHForTokensSupportingFeeOnTransferTokens(
                _amountOutMin, path, address(this), block.timestamp
        );

    }

    //todo make sure: buy tokens at a minimum price
     function swapTokensForExactETH(uint _amountOut, uint _amountInMax) public {
        address[] memory path = new address[](2);
        path[0] = weth;
        path[1] = tokenAddress;

        uniswapV2Router.swapTokensForExactETH(_amountOut, _amountInMax, path, address(this), block.timestamp);
    }

    //todo make sure:  **** Swap for ETH/SuB pair ****

    //todo make sure: sell tokens at maximum price
     function swapExactTokensForETH(uint _amountIn, uint _amountOutMin) public {
        address[] memory path = new address[](2);
        path[0] = weth;
        path[1] = tokenAddress;

         /**@author use swapExactTokensForETH for token without fee */
        uniswapV2Router.swapExactTokensForETHSupportingFeeOnTransferTokens(
                _amountIn, _amountOutMin, path, address(this), block.timestamp
        );
    }

    //todo make sure: buy tokens at market price
     function swapETHForExactTokens(uint _amountOut) public payable {
        address[] memory path = new address[](2);
        path[0] = weth;
        path[1] = tokenAddress;

        uniswapV2Router.swapETHForExactTokens(_amountOut, path, address(this), block.timestamp);
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