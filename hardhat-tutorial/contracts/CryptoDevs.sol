// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import '@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol';
import '@openzeppelin/contracts/access/Ownable.sol';
import './IWhitelist.sol';

contract CryptoDevs is ERC721Enumerable, Ownable {
    // _baseTokenURI for computing {tokenURI}. If set, the URI for each token will be the concatenation of the 'baseURI' and the 'tokenID'
    string _baseTokenURI;

    // _price is the price of one Crypto Dev NFT
    uint256 public _price = 0.01 ether;

    // _paused is used to pause contract in case of emergency
    bool public _paused;

    // max number of CryptoDevs
    uint256 public maxTokenIds = 20;

    // total number of tokenIds minted
    uint256 public tokenIds;

    // whitelist contract instance
    IWhitelist whitelist;

    // boolean to keep track if presale has started or not
    bool public presaleStarted;

    // timestamp for when presale ends
    uint256 public presaleEnded;

    modifier onlyWhenNotPaused() {
        require(!_paused, 'Contract currently paused');
        _;
    }

    // ERC721 constructor takes in "name" and "symbol" to the token collection.
    // In this case "Crypto Devs" and "CD".
    // Constructor for Crypto Devs takes in baseURI to set _baseTokenURI for the collection.
    // It also initializes an instance of whitelist interface.

    constructor(string memory baseURI, address whitelistContract)
        ERC721('CryptoDevs', 'CD')
    {
        _baseTokenURI = baseURI;
        whitelist = IWhitelist(whitelistContract);
    }

    // startPresale starts a presale for the whitelisted addresses
    function startPresale() public onlyOwner {
        presaleStarted = true;
        // set presaleEnded time as current time + 5 minutes
        presaleEnded = block.timestamp + 5 minutes;
    }

    // presaleMint allows user to mint one NFT per transaction during presale
    function presaleMint() public payable onlyWhenNotPaused {
        require(
            presaleStarted && block.timestamp < presaleEnded,
            'Presale is not running'
        );
        require(
            whitelist.whitelistedAddresses(msg.sender),
            'You are not whitelisted'
        );
        require(tokenIds < maxTokenIds, 'Exceeded maximum Crypto Devs supply');
        require(msg.value >= _price, 'Ether sent is not correct');
        tokenIds += 1;

        // _safeMint is a safer version of the _mint function ensuring:
        // 1. if address minted to is a contract -> it knows how to deal with ERC721 tokens
        // 2. if address minted is not a contract -> it works the same way as _mint
        _safeMint(msg.sender, tokenIds);
    }

    // mint allows user to mint 1 NFT per transaction after presale ends
    function mint() public payable onlyWhenNotPaused {
        require(
            presaleStarted && block.timestamp >= presaleEnded,
            'Presale has not ended yet'
        );
        require(tokenIds < maxTokenIds, 'Exceed maximum Crypto Devs supply');
        require(msg.value >= _price, 'Ether sent is not correct');
        tokenIds += 1;
        _safeMint(msg.sender, tokenIds);
    }

    //_ baseURI overides Openzeppelin's ERC721 implementation which by default returns empty string for baseURI
    function _baseURI() internal view virtual override returns (string memory) {
        return _baseTokenURI;
    }

    // setPaused makes the contract paused or unpaused
    function setPaused(bool val) public onlyOwner {
        _paused = val;
    }

    // withdraw sends all ether in the contract to the owner of the contract
    function withdraw() public onlyOwner {
        address _owner = owner();
        uint256 ammount = address(this).balance;
        (bool sent, ) = _owner.call{value: ammount}('');
        require(sent, 'Failed to send Ether');
    }

    // function to receive ether; msg.data must be empty
    receive() external payable {}

    // fallback function is called when msg.data is not empty
    fallback() external payable {}
}
