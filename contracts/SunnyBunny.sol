// SPDX-License-Identifier: MIT

/// @author - можно такую версию pragma использовать?
pragma solidity 0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/Context.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Factory.sol";
import "@uniswap/v2-periphery/contracts/interfaces/IWETH.sol";

contract SunnyBunny is ERC20, Ownable {

    mapping(address => uint256) private _balances;
    mapping(address => mapping(address => uint256)) private _allowances;

    string public _name = "Sunny Bunny";
    string public _symbol = "SuB";
    uint8 private _feePercent;
    uint256 private _totalSupply;

    address internal _feeReceiver
    ;

    constructor(
            address feeReciever, uint8 feePercent, address _router, address _factory
        ) ERC20(_name, _symbol) {
            require(feeReciever != address(0), "Tokens couldn't be transfer to a zero address");
            require(15 >= feePercent, "A fee might to be set to 15% or less");
            _totalSupply = 7e5 * 1e18;
            _balances[_msgSender()] = _totalSupply;
            _feeReceiver = feeReciever;
            _feePercent = feePercent;
            uniswapRouter = IUniswapV2Router02(_router);
            uniswapFactory = IUniswapV2Factory(_factory);
        }

    function setReceiver(address feeReceiver) public onlyOwner {
        require(feeReceiver != address(0), "Receiver\'s address couldn\'t be set to zero");
        _feeReceiver = feeReceiver;
    }

    function getFeeReceiver() view public returns(address) {
        return _feeReceiver;
    }

    // A fee could not be bigger than 15% 
    function setFeePercent(uint8 feePercent) public onlyOwner {
        require(15 >= feePercent, "A fee might to be set to 15% or less");
        _feePercent = feePercent;
    }
    
    function getFeePercent() view public returns(uint8) {
        return _feePercent;
    }

    /**@dev override native ERC20 function */
    // !! Если не изменить _transfer, а сделать свою, то любой сможет вызвать ERC20 функцию transfer, которая работает без комиссии
    function _transfer(
        address sender,
        address recipient,
        uint256 amount,
        bool isUni
    ) internal {
            require(sender != address(0), "ERC20: transfer from the zero address");
            require(recipient != address(0), "ERC20: transfer to the zero address");

            _beforeTokenTransfer(sender, recipient, amount);

            if (isUni == false) {
                uint256 absoluteFee;
                uint256 amountWithFee;

                if(sender == owner()) {
                    absoluteFee = 0;
                    amountWithFee = amount;
                } else (absoluteFee, amountWithFee) = calculateFee(amount);

                uint256 senderBalance = _balances[sender];
                require(senderBalance >= amountWithFee, "ERC20: transfer amount exceeds balance");
                unchecked {
                    _balances[sender] = senderBalance - amountWithFee;
                }
                _balances[recipient] += amount;
                _balances[_feeReceiver] += absoluteFee;

                emit Transfer(sender, recipient, amount);
                emit Transfer(sender, _feeReceiver, absoluteFee);
            } else {
                uint256 senderBalance = _balances[sender];
                require(senderBalance >= amount, "ERC20: transfer amount exceeds balance");
                unchecked {
                    _balances[sender] = senderBalance - amount;
                }
                _balances[recipient] += amount;

                emit Transfer(sender, recipient, amount);
            }

            _afterTokenTransfer(sender, recipient, amount);
    }

    /**
     * @dev See {IERC20-transferFrom}.
     *
     * Emits an {Approval} event indicating the updated allowance. This is not
     * required by the EIP. See the note at the beginning of {ERC20}.
     *
     * Requirements:
     *
     * - `sender` and `recipient` cannot be the zero address.
     * - `sender` must have a balance of at least `amount`.
     * - the caller must have allowance for ``sender``'s tokens of at least
     * `amount`.
     */
    function _transferFromForChoice(
        address sender,
        address recipient,
        uint256 amount,
        bool isUni
    ) internal returns (bool) {
        _transfer(sender, recipient, amount, isUni);

        uint256 currentAllowance = _allowances[sender][_msgSender()];
        require(currentAllowance >= amount, "ERC20: transfer amount exceeds allowance");
        unchecked {
            _approve(sender, _msgSender(), currentAllowance - amount);
        }

        return true;
    }

    /** @dev use function for transfers with fee  */
    function transfer(address recipient, uint256 amount) public virtual override returns (bool) {
        _transfer(_msgSender(), recipient, amount, false);
        return true;
    }

    /** @dev use function for Uniswap only or for transfers without fee */
    function transferForUniswap(address recipient, uint256 amount) public returns (bool) {
        _transfer(_msgSender(), recipient, amount, true);
        return true;
    }

    /** @dev use function for transfers with fee */
    function transferFrom(address sender, address recipient, uint256 amount) public virtual override returns (bool) {
        bool result = _transferFromForChoice(sender, recipient, amount, false);
        return result;
    }

    /** @dev use function for Uniswap only or for transfers without fee */
    function transferFromForUniswap(address sender, address recipient, uint256 amount) public returns (bool) {
        bool result = _transferFromForChoice(sender, recipient, amount, true);
        return result;
    }

    function calculateFee(uint256 amount) view internal returns (uint256, uint256) {
        uint256 absoluteFee = amount * _feePercent / 100;
        uint256 amountWithFee = amount + absoluteFee;
        return (absoluteFee, amountWithFee);
    }

    address public tokenUniswapPair;

    IUniswapV2Factory public uniswapFactory;
    IUniswapV2Router02 public uniswapRouter;

    function createUniswapPair() public returns (address) {
        require(tokenUniswapPair == address(0), "Token: pool already created");
        tokenUniswapPair = uniswapFactory.createPair(
            address(uniswapRouter.WETH()),
            address(this)
        );
        return tokenUniswapPair;
    }

    function getUniswapRouterWETH() public view returns (address) {
        return uniswapRouter.WETH();
    }

    ///////////  Below standard ERC20 functions almost \\\\\\\\\\\\\

    /**
     * @dev See {IERC20-totalSupply}.
     */
    function totalSupply() public view virtual override returns (uint256) {
        return _totalSupply;
    }

    /**
     * @dev See {IERC20-balanceOf}.
     */
    function balanceOf(address account) public view virtual override returns (uint256) {
        return _balances[account];
    }

    /**
     * @dev See {IERC20-transfer}.
     *
     * Requirements:
     *
     * - `recipient` cannot be the zero address.
     * - the caller must have a balance of at least `amount`.
     */
    

    /**
     * @dev See {IERC20-allowance}.
     */
    function allowance(address _owner, address spender) public view virtual override returns (uint256) {
        return _allowances[_owner][spender];
    }

    /**
     * @dev See {IERC20-approve}.
     *
     * Requirements:
     *
     * - `spender` cannot be the zero address.
     */
    function approve(address spender, uint256 amount) public virtual override returns (bool) {
        _approve(_msgSender(), spender, amount);
        return true;
    }

    /**
     * @dev Atomically increases the allowance granted to `spender` by the caller.
     *
     * This is an alternative to {approve} that can be used as a mitigation for
     * problems described in {IERC20-approve}.
     *
     * Emits an {Approval} event indicating the updated allowance.
     *
     * Requirements:
     *
     * - `spender` cannot be the zero address.
     */
    function increaseAllowance(address spender, uint256 addedValue) public override returns (bool) {
        _approve(_msgSender(), spender, _allowances[_msgSender()][spender] + addedValue);
        return true;
    }

    /**
     * @dev Atomically decreases the allowance granted to `spender` by the caller.
     *
     * This is an alternative to {approve} that can be used as a mitigation for
     * problems described in {IERC20-approve}.
     *
     * Emits an {Approval} event indicating the updated allowance.
     *
     * Requirements:
     *
     * - `spender` cannot be the zero address.
     * - `spender` must have allowance for the caller of at least
     * `subtractedValue`.
     */
    function decreaseAllowance(address spender, uint256 subtractedValue) public override returns (bool) {
        uint256 currentAllowance = _allowances[_msgSender()][spender];
        require(currentAllowance >= subtractedValue, "ERC20: decreased allowance below zero");
        unchecked {
            _approve(_msgSender(), spender, currentAllowance - subtractedValue);
        }

        return true;
    }

        /** @dev Creates `amount` tokens and assigns them to `account`, increasing
     * the total supply.
     *
     * Emits a {Transfer} event with `from` set to the zero address.
     *
     * Requirements:
     *
     * - `account` cannot be the zero address.
     */
    function _mint(address account, uint256 amount) internal override {
        require(account != address(0), "ERC20: mint to the zero address");

        _beforeTokenTransfer(address(0), account, amount);

        _totalSupply += amount;
        _balances[account] += amount;
        emit Transfer(address(0), account, amount);

        _afterTokenTransfer(address(0), account, amount);
    }

    /**
     * @dev Destroys `amount` tokens from `account`, reducing the
     * total supply.
     *
     * Emits a {Transfer} event with `to` set to the zero address.
     *
     * Requirements:
     *
     * - `account` cannot be the zero address.
     * - `account` must have at least `amount` tokens.
     */
    function _burn(address account, uint256 amount) internal override {
        require(account != address(0), "ERC20: burn from the zero address");

        _beforeTokenTransfer(account, address(0), amount);

        uint256 accountBalance = _balances[account];
        require(accountBalance >= amount, "ERC20: burn amount exceeds balance");
        unchecked {
            _balances[account] = accountBalance - amount;
        }
        _totalSupply -= amount;

        emit Transfer(account, address(0), amount);

        _afterTokenTransfer(account, address(0), amount);
    }

    /**
     * @dev Sets `amount` as the allowance of `spender` over the `owner` s tokens.
     *
     * This internal function is equivalent to `approve`, and can be used to
     * e.g. set automatic allowances for certain subsystems, etc.
     *
     * Emits an {Approval} event.
     *
     * Requirements:
     *
     * - `owner` cannot be the zero address.
     * - `spender` cannot be the zero address.
     */
    function _approve(
        address _owner,
        address spender,
        uint256 amount
    ) internal override {
        require(_owner!= address(0), "ERC20: approve from the zero address");
        require(spender != address(0), "ERC20: approve to the zero address");

        _allowances[_owner][spender] = amount;
        emit Approval(owner(), spender, amount);
    }

}