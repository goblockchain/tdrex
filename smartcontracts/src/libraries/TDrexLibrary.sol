pragma solidity ^0.8.13;

// TODO: import TDrexPair instead of below
// import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol";
// import "";
import "./SafeMath.sol";
import "../../lib/openzeppelin-contracts/contracts/interfaces/IERC165.sol";
import "../interfaces/ITDrexPair.sol";
import "../interfaces/ITDrexFactory.sol";
import "../../lib/forge-std/src/console.sol";

library TDrexLibrary {
    using SafeMath for uint;

    /*╔═════════════════════════════╗
      ║           ERRORS            ║
      ╚═════════════════════════════╝*/
    error Library_Identical_Addresses(address identicalToken);
    error Library_Zero_Address();
    error Library_Insufficient_Amount(uint amount);
    error Library_Insufficient_Liquidity(uint reserveA, uint reserveB);
    error Library_Insufficient_INPUT_Amount(uint amount);
    error Library_Insufficient_OUTPUT_Amount(uint amount);
    error Library_Invalid_Path(uint invalidPathLength);
    error Library_Pair_Unexists(address token0, address token1);

    function sortTokens(
        address tokenA,
        address tokenB
    ) internal view returns (address token0, address token1) {
        if (tokenA == tokenB) revert Library_Identical_Addresses(tokenA);

        // ERC20 InterfaceID == 0x36372b07
        // ERC1155 InterfaceID == 0xd9b67a26
        try IERC165(tokenA).supportsInterface(bytes4(0xd9b67a26)) returns (
            bool yes
        ) {
            if (yes) {
                // if tokenA is the IERC1155
                token0 = tokenB;
                token1 = tokenA;
            } else {
                // in case ERC20 is IERC165
                token0 = tokenA;
                token1 = tokenB;
            }
        } catch {
            //in case tokenA is ERC20 without IERC165
            token0 = tokenA;
            token1 = tokenB;
        }
        if (token0 == address(0)) revert Library_Zero_Address();
    }

    // calculates the CREATE2 address for a pair without making any external calls
    function pairFor(
        address factory,
        address tokenA,
        address tokenB,
        uint id
    ) internal view returns (address pair) {
        (address token0, address token1) = sortTokens(tokenA, tokenB);
        pair = ITDrexFactory(factory).getPair(token0, token1, id);
        if (pair == address(0)) revert Library_Pair_Unexists(token0, token1);
    }

    // fetches and sorts the reserves for a pair
    function getReserves(
        address factory,
        address tokenA,
        address tokenB,
        uint id
    ) internal view returns (uint reserveA, uint reserveB) {
        (address token0, ) = sortTokens(tokenA, tokenB);
        (uint reserve0, uint reserve1, ) = ITDrexPair(
            pairFor(factory, tokenA, tokenB, id)
        ).getReserves();
        (reserveA, reserveB) = tokenA == token0
            ? (reserve0, reserve1)
            : (reserve1, reserve0);
    }

    // given some amount of an asset and pair reserves, returns an equivalent amount of the other asset
    function quote(
        uint amountA,
        uint reserveA,
        uint reserveB
    ) internal pure returns (uint amountB) {
        if (amountA == 0) revert Library_Insufficient_Amount(amountA);
        if (reserveA == 0 || reserveB == 0)
            revert Library_Insufficient_Liquidity(reserveA, reserveB);
        amountB = amountA.mul(reserveB) / reserveA;
    }

    // given an input amount of an asset and pair reserves, returns the maximum output amount of the other asset
    function getAmountOut(
        uint amountIn,
        uint reserveIn,
        uint reserveOut
    ) internal pure returns (uint amountOut) {
        if (amountIn == 0) revert Library_Insufficient_INPUT_Amount(amountIn);
        if (reserveIn == 0 || reserveOut == 0)
            revert Library_Insufficient_Liquidity(reserveIn, reserveOut);

        // TODO: Will we have fee. I thought we could set it on constructor. Fee here: 3/1000 == 0.3%
        uint amountInWithFee = amountIn.mul(997);
        uint numerator = amountInWithFee.mul(reserveOut);
        uint denominator = reserveIn.mul(1000).add(amountInWithFee);
        amountOut = numerator / denominator;
    }

    // given an output amount of an asset and pair reserves, returns a required input amount of the other asset
    function getAmountIn(
        uint amountOut,
        uint reserveIn,
        uint reserveOut
    ) internal pure returns (uint amountIn) {
        if (amountOut == 0)
            revert Library_Insufficient_OUTPUT_Amount(amountOut);
        if (reserveIn == 0 || reserveOut == 0)
            revert Library_Insufficient_Liquidity(reserveIn, reserveOut);
        uint numerator = reserveIn.mul(amountOut).mul(1000);
        uint denominator = reserveOut.sub(amountOut).mul(997);
        amountIn = (numerator / denominator).add(1);
    }

    function getAmountsOut(
        address factory,
        uint amountIn,
        address[] memory path,
        uint id
    ) internal view returns (uint[] memory amounts) {
        uint length = path.length;
        amounts = new uint[](length);
        amounts[0] = amountIn;
        // first must be an ERC20 token and second must be an ERC1155 token.
        if (length != 2) revert Library_Invalid_Path(length);
        (uint reserveIn, uint reserveOut) = getReserves(
            factory,
            path[0],
            path[1],
            id
        );

        amounts[1] = getAmountOut(amountIn, reserveIn, reserveOut);
    }

    // performs chained getAmountIn calculations on any number of pairs
    function getAmountsIn(
        address factory,
        uint amountOut,
        address[] memory path,
        uint id
    ) internal view returns (uint[] memory amounts) {
        uint pathLength = path.length;
        if (pathLength < 2) revert Library_Invalid_Path(pathLength);
        amounts = new uint[](pathLength);
        amounts[amounts.length - 1] = amountOut;
        for (uint i = pathLength - 1; i > 0; ) {
            (uint reserveIn, uint reserveOut) = getReserves(
                factory,
                path[i - 1],
                path[i],
                id
            );
            amounts[i - 1] = getAmountIn(amounts[i], reserveIn, reserveOut);
            unchecked {
                --i; // bounded by i>0 in loop
            }
        }
    }
}
