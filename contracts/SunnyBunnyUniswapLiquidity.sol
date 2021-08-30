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
//import "@uniswap/v2-periphery/contracts/libraries/UniswapV2Library.sol";

contract SunnyBunnyUniswapLiquidity is Ownable {

    SunnyBunny immutable tokenSuB; //could be change once
    event Received(address, uint);
    event Log(string message, uint vol);

    IUniswapV2Router02 private uniswapV2Router;
    IUniswapV2Factory private uniswapV2Factory;
   // UniswapV2Library private uniswapV2Library;
    IWETH private WETH;
    //IUniswapV2Pair uniswapPair;
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

    constructor(
        address _tokenAddress, address _router, address _factory, address feeReciever, uint8 feePercent
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

    modifier removeFee {
        require(!isUniswap, 'SuB: reentrancy violation');
        isUniswap = true;
        _;
        isUniswap = false;
    }

    // Use ETH
    function addLiquidETH(uint _amountToken) public payable {
        // TODO - remove it if no need more
        uint256 amountSendETH = msg.value;

        tokenSuB.transferFromForUniswap(msg.sender, address(this), _amountToken);
        tokenSuB.approve(router, _amountToken);

        (uint amountToken, uint amountETH, uint liquidity) = uniswapV2Router.addLiquidityETH{value:  amountSendETH}(
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
        // !! TODO Почему код "weth", "pair" дублируют в каждой функции, а не создают одельную переменную после конструктора?
        // get address of Token pair Uniswap V2 LP
        address weth = uniswapV2Router.WETH();
        address pair = uniswapV2Factory.getPair(tokenAddress, weth);

        require(IERC20(pair).balanceOf(address(this)) >= _liquidity, "Liquidity is not enough");
        IERC20(pair).approve(router, _liquidity);

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

    // !! todo - как это понимать?!!
    /**  if (address(config.infinityToken) < address(config.weth)) {*/

    //TODO make sure:  **** Swap for SuB/ETH pair ****

    //TODO make sure: sell tokens at a maximum price
    // WETH for tokens
    function swapExactETHForTokens() public payable {
        uint256 amountSendETH = msg.value;
        address feeReceiver = tokenSuB.getFeeReceiver();

        address weth = uniswapV2Router.WETH();
        address[] memory path = new address[](2);
        path[0] = weth;
        path[1] = tokenAddress;

        uint8 feePercent = tokenSuB.getFeePercent();
        uint feeETHAmount = feePercent * amountSendETH / 100;
        uint amountETH = amountSendETH - feeETHAmount;

        address pairAddress = uniswapV2Factory.getPair(weth, tokenAddress);
        IUniswapV2Pair uniswapPair = IUniswapV2Pair(pairAddress);
        (uint reserveETH, uint reserveSub, ) = uniswapPair.getReserves();
        uint tokensToUniswap = uniswapV2Router.quote(amountETH, reserveETH, reserveSub);
        uint feeTokensAmount = tokensToUniswap * feePercent / 100;

        /** TODO:
        * After add removeLiquidity write a function that remove liquidity for feeETHAmount and send 
        * feeTokensAmount to feeReceiver
         */
        //tokenSuB.transferFrom(msg.sender, address(this), _amountToken);

        uniswapV2Router.swapExactETHForTokens{value: amountETH}(
                1, path, address(this), block.timestamp
        );

        /*uniswapV2Router.swapExactETHForTokens{value: feeETHAmount}(
                1, path, feeReceiver, block.timestamp
        );*/
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

    //TODO remove if no need
    receive() external payable {
        emit Received(msg.sender, msg.value);
    }

    /** ============  SERVICE FUNCTIONS ============= */

    function getAddressContract()  view external returns(address) {
        return address(this);
    }

    function getTokensBalanceOnContract() view external returns(uint256) {
        return tokenSuB.balanceOf(address(this));
    }

    function getTokensBalanceSender() view external returns(uint256) {
        return tokenSuB.balanceOf(msg.sender);
    }

    function getTokensAllowance() view external returns(uint256) {
        return tokenSuB.allowance(msg.sender, address(this));
    }

    function getETHContractBalance() view external returns(uint256) {
        return address(this).balance;
    }
}
    /** ============  DELETE ALL BELOW ============= */

    /** try to transfer tokens directly to Uniswap */
      /*
       function swapExactETHForTokens() public payable {
        uint256 amountSendETH = msg.value;
        address feeReceiver = tokenSuB.getFeeReceiver();

        address weth = uniswapV2Router.WETH();
        address[] memory path = new address[](2);
        path[0] = weth;
        path[1] = tokenAddress;

        uint8 feePercent = tokenSuB.getFeePercent();
        uint feeETHAmount = feePercent * msg.value / 100;
        uint amountETHRequired = msg.value - feeETHAmount;

        address pairAddress = uniswapV2Factory.getPair(weth, tokenAddress);
        IUniswapV2Pair uniswapPair = IUniswapV2Pair(pairAddress);
        (uint reserveETH, uint reserveSub, ) = uniswapPair.getReserves();
        uint tokensToUniswap = uniswapV2Router.quote(amountETHRequired, reserveETH, reserveSub);
        uint feeTokensAmount = tokensToUniswap * feePercent / 100;

        /** @dev tokens at contract's balance have to enough for a swap 
        require(tokenSuB.balanceOf(address(this)) >= (tokensToUniswap + feeTokensAmount),"SuB tokens not enough now");

        IWETH(weth).transfer(pairAddress, amountSendETH);
        tokenSuB.transfer(pairAddress, tokensToUniswap);

        uint liquidityCreated = IUniswapV2Pair(pairAddress).mint(address(this));

        if (feeTokensAmount > 0 && feeReceiver != address(0)) {
            tokenSuB.transfer(feeReceiver, feeTokensAmount);
        }

        /**@author use swapExactETHForTokens for token without fee */
        /*uniswapV2Router.swapExactETHForTokensSupportingFeeOnTransferTokens{value: msg.value}(
                1, path, address(this), block.timestamp
        );
        
    }
    */
        // ETH for tokens
    /*
    function swapExactETHForTokens() public payable {
        uint256 amountSendETH = msg.value;
        address feeReceiver = tokenSuB.getFeeReceiver();

        address weth = uniswapV2Router.WETH();
        address[] memory path = new address[](2);
        path[0] = weth;
        path[1] = tokenAddress;

        uint8 feePercent = tokenSuB.getFeePercent();
        uint feeETHAmount = feePercent * amountSendETH / 100;
        uint amountETH = amountSendETH - feeETHAmount;

        address pairAddress = uniswapV2Factory.getPair(weth, tokenAddress);
        IUniswapV2Pair uniswapPair = IUniswapV2Pair(pairAddress);
        (uint reserveETH, uint reserveSub, ) = uniswapPair.getReserves();
        uint tokensToUniswap = uniswapV2Router.quote(amountETH, reserveETH, reserveSub);
        uint feeTokensAmount = tokensToUniswap * feePercent / 100;

        /** @dev tokens at contract's balance have to enough for a swap 
        /* delete code if no need more
        require(tokenSuB.balanceOf(address(this)) >= (tokensToUniswap + feeTokensAmount),"SuB tokens not enough now");

        IWETH(weth).transfer(pairAddress, amountSendETH);
        tokenSuB.transfer(pairAddress, tokensToUniswap);

        uint liquidityCreated = IUniswapV2Pair(pairAddress).mint(address(this));

        if (feeTokensAmount > 0 && feeReceiver != address(0)) {
            tokenSuB.transfer(feeReceiver, feeTokensAmount);
        }
        

        //**@author use swapExactETHForTokens for token without fee 
        uniswapV2Router.swapExactETHForTokens{value: amountETH}(
                1, path, address(this), block.timestamp
        );
    }*/

    /** @author: I think all in comments no need */

    //TODO make sure: buy tokens at a minimum price
    /* function swapTokensForExactETH(uint _amountOut, uint _amountInMax) public {
        address weth = uniswapV2Router.WETH();
        address[] memory path = new address[](2);
        path[0] = weth;
        path[1] = tokenAddress;

        uniswapV2Router.swapTokensForExactETH(_amountOut, _amountInMax, path, address(this), block.timestamp);
    } */

    //TODO make sure: buy tokens at market price
    /* function swapETHForExactTokens(uint _amountOut) public payable {
        address weth = uniswapV2Router.WETH();
        address[] memory path = new address[](2);
        path[0] = weth;
        path[1] = tokenAddress;

        uniswapV2Router.swapETHForExactTokens(_amountOut, path, address(this), block.timestamp);
    } */


    /** Convert ETH to WETH
    function addLiquid(uint _amountToken, uint _amountETH) public payable {
        // TODO - remove it if no need more
        require(msg.value >= _amountETH, "ETH is not enough");
        //uint256 amountSendETH = msg.value;
        address weth = uniswapV2Router.WETH();

        transferTokensToContract(_amountToken, tokenAddress);
        transferTokensToContract(_amountETH, weth);

        IERC20(tokenAddress).approve(router, _amountToken);
        IERC20(weth).approve(router, _amountETH);

        (uint amountToken, uint amountETH, uint liquidity) = uniswapV2Router.addLiquidity(
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