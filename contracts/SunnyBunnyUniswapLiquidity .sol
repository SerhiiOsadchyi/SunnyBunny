// SPDX-License-Identifier: MIT

pragma solidity >=0.6.2 <0.9.0;

//import {factorySuB} from "./SunnyBunny.sol"; не работает - дока
// https://docs.soliditylang.org/en/v0.5.0/layout-of-source-files.html?highlight=import#import

import {tokenSuB as SuB} from "./SunnyBunny.sol";

contract SunnyBunnyUniswapLiquidity is Ownable {
    /** @dev Address from doc https://uniswap.org/docs/v2/smart-contracts/factory/#address */
    address private constant UNI_FACTORY = 0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f;

    /** @dev Address from doc https://uniswap.org/docs/v2/smart-contracts/router02/ */
    address private constant ROUTER02 = 0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D;

    /** @dev Address from doc to https://blog.0xproject.com/canonical-weth-a9aa7d0279dd
    * Mainnet: 0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2
    * Kovan: 0xd0a1e359811322d97991e03f863a0c30c2cf029c
    * Ropsten: 0xc778417e063141139fce010982780140aa0cd5ab
    * Rinkeby: 0xc778417e063141139fce010982780140aa0cd5ab
    */
    address private constant WETH = 0xc778417E063141139Fce010982780140Aa0cD5Ab;

    //address internal owner = owner();
    //address internal addrSuBtoken;

    event Log(string message, uint vol);

    function addLiquidity(uint amountSuB, uint amountWETH) external {
        SuB.transferFrom(owner(), address(this), amountSuB);
        WETH.transferFrom(SuB.owner, address(this), amountWETH);
    }

}