// SPDX-License-Identifier: MIT

pragma solidity 0.8.0;

/**import {factorySuB} from "./SunnyBunny.sol"; не работает - дока здесь
* https://docs.soliditylang.org/en/v0.5.0/layout-of-source-files.html?highlight=import#import
*/

import "./SunnyBunny.sol";
import "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Factory.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol";
import "@uniswap/v2-periphery/contracts/interfaces/IWETH.sol";

contract SunnyBunnyUniswapLiquidity is Ownable {

    SunnyBunny immutable tokenSuB; //could be change once
    event Received(address, uint);
    event Log(string message, uint vol);

    IUniswapV2Router02 private uniswapV2Router;
    IUniswapV2Factory private uniswapV2Factory;
    IWETH private WETH;
    IUniswapV2Pair uniswapPair;

    struct SwapTokens {
        address feeReceiver;
        address weth;
        address[] path;
        uint8 feePercent;
        uint feeETHAmount;
        uint amountETH;
        address pairAddress;
    }

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

    address router;
    address factory;
    bool private isUniswap = false;
    SwapTokens public swap;

    constructor(
        address _tokenAddress, address _router, address _factory
        ) {
        tokenSuB = SunnyBunny(_tokenAddress);
        uniswapV2Router = IUniswapV2Router02(_router);
        uniswapV2Factory = IUniswapV2Factory(_factory);
        router = _router;
        factory = _factory;
        tokenAddress = _tokenAddress;
    }

    function transferETHToContract() public payable {
    }

    // Use ETH
    function addLiquidETH(uint _amountToken) public payable {
        //require(tokenSuB.balanceOf(_msgSender()) >= _amountToken, "Tokens amount is not enough");
        uint256 amountSendETH = msg.value;
        address weth = uniswapV2Router.WETH();
        address pairAddress = uniswapV2Factory.getPair(tokenAddress, weth);

        tokenSuB.approve(router, _amountToken);

        (uint amountToken, uint amountETH, uint liquidity) = uniswapV2Router.addLiquidityETH{value:  amountSendETH}(
            tokenAddress,
            _amountToken,
            1, // for change add _amountTokenMin like argument for this function and parent addLiquidity()
            1, // for change add _amountETHMin to argument for this function and parent addLiquidity()
            address(this),
            block.timestamp
        );

        uniswapPair = IUniswapV2Pair(pairAddress);
        uniswapPair.transfer(_msgSender(), liquidity);

        emit Log("amount token  = ", amountToken);
        emit Log("amount ETH  = ", amountETH);
        emit Log("amount liquidity  = ", liquidity);
    }

    // **** SWAP ****
    // requires the initial amount to have already been sent to the first pair

    // !! todo - как это понимать?!!
    /**  if (address(config.infinityToken) < address(config.weth)) {*/

    //TODO make sure:  **** Swap for SuB/ETH pair ****

    //TODO make sure: sell tokens at a maximum price
    // WETH for tokens
    function swapExactETHForTokens() public payable {
        uint256 amountSendETH = msg.value;
        swap.feeReceiver = tokenSuB.getFeeReceiver();

        swap.weth = uniswapV2Router.WETH();
        swap.path = new address[](2);
        swap.path[0] = swap.weth;
        swap.path[1] = tokenAddress;
        swap.feePercent = tokenSuB.getFeePercent();
        swap.feeETHAmount = swap.feePercent * amountSendETH / 100;
        swap.amountETH = amountSendETH - swap.feeETHAmount;
        swap.pairAddress = uniswapV2Factory.getPair(swap.weth, tokenAddress);

        uniswapPair = IUniswapV2Pair(swap.pairAddress);
        (uint reserveETH, uint reserveSub, ) = uniswapPair.getReserves();
        uint tokensToSender = uniswapV2Router.quote(swap.amountETH, reserveETH, reserveSub);

        uniswapV2Router.swapExactETHForTokensSupportingFeeOnTransferTokens{value: amountSendETH} (
                1, swap.path, address(this), block.timestamp
        );
    }

    //TODO make sure:   Swap for ETH/SuB pair

    //TODO make sure: sell tokens at maximum price
    function swapExactTokensForETH(uint _amountIn, uint _amountOutMin) public {
        address weth = uniswapV2Router.WETH();
        address[] memory path = new address[](2);
        path[0] = tokenAddress;
        path[1] = weth;

        tokenSuB.approve(router, _amountIn);

        // @author use swapExactTokensForETH for token without fee
        uniswapV2Router.swapExactTokensForETHSupportingFeeOnTransferTokens(
                _amountIn, _amountOutMin, path, address(this), block.timestamp
        );
    }

    function removeLiquid(uint _liquidity) external {
        address payable sender = payable(_msgSender());

        uniswapPair.approve(router, _liquidity);

        (uint amountToken, uint amountETH) = uniswapV2Router.removeLiquidityETH(
            //uniswapV2Router.removeLiquidityETH(
            tokenAddress,
            _liquidity,
            0, // for change add _amountTokenMin like argument for this function
                //and parent removeETHLiquidityFromToken()
            0, // for change add _amountETHMin to argument for this function
            address(this), // for change add address _to like argument for this function
                            //and parent removeETHLiquidityFromToken()
            block.timestamp + 20
        );

        sender.transfer(amountETH);
        tokenSuB.transferWithFee(_msgSender(), amountToken);
    }

    //TODO remove if no need
    receive() external payable {
        emit Received(_msgSender(), msg.value);
    }

    /** ============  SERVICE FUNCTIONS ============= */

    function getAddressContract()  view external returns(address) {
        return address(this);
    }

    function getTokensBalanceOnContract() view external returns(uint256) {
        return tokenSuB.balanceOf(address(this));
    }

    function getTokensBalanceSender() view external returns(uint256) {
        return tokenSuB.balanceOf(_msgSender());
    }

    function getTokensAllowance() view external returns(uint256) {
        return tokenSuB.allowance(_msgSender(), address(this));
    }

    function getETHContractBalance() view external returns(uint256) {
        return address(this).balance;
    }
}
    /** ============  DELETE ALL BELOW ============= */
