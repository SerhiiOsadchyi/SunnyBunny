// SPDX-License-Identifier: MIT

pragma solidity 0.8.0;

/**import {factorySuB} from "./SunnyBunny.sol"; не работает - дока здесь
* https://docs.soliditylang.org/en/v0.5.0/layout-of-source-files.html?highlight=import#import
*/

import "./SunnyBunny.sol";
import "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Factory.sol";
import "@uniswap/v2-periphery/contracts/interfaces/IWETH.sol";

contract SunnyBunnyUniswapLiquidity is Ownable {

    SunnyBunny immutable tokenSuB; //could be change once
    event Received(address, uint);
    event Log(string message, uint vol);

    IUniswapV2Router02 private uniswapV2Router;
    IUniswapV2Factory private uniswapV2Factory;
    IWETH private WETH;
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

    //IUniswapV2Router02 uniswapV2Router = IUniswapV2Router02(uniswapV2Router);

    function transferTokensToContract(uint _amountToken, address _tokenAddress) public {
        IERC20(_tokenAddress).transferFrom(msg.sender, address(this), _amountToken);
    }

    function transferETHToContract() public payable {
    }

    /** Convert ETH to WETH
    function addLiquid(uint _amountToken, uint _amountETH) public payable {
        // todo - remove it if no need more
        require(msg.value >= _amountETH, "ETH is not enough");
        //uint256 amountSendETH = msg.value;
        address weth = uniswapV2Router.WETH();

        transferTokensToContract(_amountToken, tokenAddress);
        transferTokensToContract(_amountETH, weth);

        IERC20(tokenAddress).approve(ROUTER02, _amountToken);
        IERC20(weth).approve(ROUTER02, _amountETH);

        (uint amountToken, uint amountETH, uint liquidity) = IUniswapV2Router02(ROUTER02).addLiquidity(
            tokenAddress,
            weth,
            _amountToken,
            _amountETH,
            1, // for change add _amountTokenMin like argument for this function and parent addLiquidity()
            1, // for change add _amountETHMin to argument for this function and parent addLiquidity()
            msg.sender,
            block.timestamp
        );

        emit Log("amount token  = ", amountToken);
        emit Log("amount ETH  = ", amountETH);
        emit Log("amount liquidity  = ", liquidity);
    }*/

    // Use ETH 
    function addLiquid(uint _amountToken) public payable {
        // todo - remove it if no need more
        uint256 amountSendETH = msg.value;

        transferTokensToContract(_amountToken, tokenAddress);

        IERC20(tokenAddress).approve(ROUTER02, _amountToken);

        (uint amountToken, uint amountETH, uint liquidity) = IUniswapV2Router02(ROUTER02).addLiquidityETH{value:  amountSendETH}(
            tokenAddress,
            _amountToken,
            1, // for change add _amountTokenMin like argument for this function and parent addLiquidity()
            1, // for change add _amountETHMin to argument for this function and parent addLiquidity()
            address(this),
            block.timestamp
        );

        emit Log("amount token  = ", amountToken);
        emit Log("amount ETH  = ", amountETH);
        emit Log("amount liquidity  = ", liquidity);

    }

    function removeLiquid(uint _liquidity) external {
        // todo Почему код "weth", "pair" дублируют в каждой функции, а не создают одельную переменную после конструктора?
        // get address of Token pair Uniswap V2 LP
        address weth = uniswapV2Router.WETH();
        address pair = uniswapV2Factory.getPair(tokenAddress, weth);

        require(IERC20(pair).balanceOf(address(this)) >= _liquidity, "Liquidity is not enough");
        IERC20(pair).approve(ROUTER02, _liquidity);

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
        // todo Почему код "path" дублируют в каждой функции, а не создают одельную переменную после конструктора?
        address weth = uniswapV2Router.WETH();
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
        address weth = uniswapV2Router.WETH();
        address[] memory path = new address[](2);
        path[0] = weth;
        path[1] = tokenAddress;

        uniswapV2Router.swapTokensForExactETH(_amountOut, _amountInMax, path, address(this), block.timestamp);
    }

    //todo make sure:  **** Swap for ETH/SuB pair ****

    //todo make sure: sell tokens at maximum price
     function swapExactTokensForETH(uint _amountIn, uint _amountOutMin) public {
        address weth = uniswapV2Router.WETH();
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
        address weth = uniswapV2Router.WETH();
        address[] memory path = new address[](2);
        path[0] = weth;
        path[1] = tokenAddress;

        uniswapV2Router.swapETHForExactTokens(_amountOut, path, address(this), block.timestamp);
    }

    /** todo remove if no need */
        receive() external payable {
            emit Received(msg.sender, msg.value);
        }

    /** ============  SERVICE FUNCTIONS ============= */

    function getAddressContract()  view external returns(address) {
        return address(this);
    }

    function getTokensBalanceOnContract() view external returns(uint256) {
        return IERC20(tokenAddress).balanceOf(address(this));
    }

    function getTokensBalanceSender() view external returns(uint256) {
        return IERC20(tokenAddress).balanceOf(msg.sender);
    }

    function getTokensAllowance() view external returns(uint256) {
        return IERC20(tokenAddress).allowance(msg.sender, address(this));
    }

    function getETHContractBalance() view external returns(uint256) {
        return address(this).balance;
    }
}