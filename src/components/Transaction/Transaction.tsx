import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ethers } from 'ethers';

import DataList from '../DataList/DataList';
import Modal from '../Modal/Modal';
import SaveContacts from '../SaveContacts/SaveContacts';
import Spinner from '../Spinner/Spinner';

import { ITransactionProps } from './Types';

import { ADDRESS_VALIDATION } from '../../constants/regExs';
import { INPUT_VALIDATION } from '../../constants/regExs';
import { WIDTH_BP, ZK_FEE_MULTIPLIER } from '../../constants/magicNumbers';
import { ZK_EXPLORER } from '../../constants/links';

import { useRootData } from '../../hooks/useRootData';

import './Transaction.scss';

const Transaction: React.FC<ITransactionProps> = ({
  addressValue,
  balances,
  hash,
  isExecuted,
  isInput,
  isLoading,
  onChangeAddress,
  onChangeAmount,
  price,
  propsMaxValue,
  propsSymbolName,
  propsToken,
  setHash,
  setExecuted,
  setLoading,
  setTransactionType,
  setSymbol,
  title,
  transactionAction,
  type,
}): JSX.Element => {
  const {
    ethId,
    hintModal,
    provider,
    searchBalances,
    searchContacts,
    setBalances,
    setContacts,
    setError,
    setHintModal,
    setModal,
    setWalletAddress,
    walletAddress,
    zkBalancesLoaded,
    zkWallet,
  } = useRootData(
    ({
      ethId,
      hintModal,
      provider,
      searchBalances,
      searchContacts,
      setBalances,
      setContacts,
      setHintModal,
      setError,
      setModal,
      setWalletAddress,
      verifyToken,
      walletAddress,
      zkBalancesLoaded,
      zkWallet,
    }) => ({
      ethId: ethId.get(),
      hintModal: hintModal.get(),
      provider: provider.get(),
      searchBalances: searchBalances.get(),
      searchContacts: searchContacts.get(),
      setBalances,
      setContacts,
      setHintModal,
      setError,
      setModal,
      setWalletAddress,
      verifyToken: verifyToken.get(),
      walletAddress: walletAddress.get(),
      zkBalancesLoaded: zkBalancesLoaded.get(),
      zkWallet: zkWallet.get(),
    }),
  );

  const body = document.querySelector('#body');
  const dataPropertySymbol = 'symbol';
  const dataPropertyName = 'name';
  const myRef = useRef<HTMLInputElement>(null);

  const [amount, setAmount] = useState<number>(0);
  const [fee, setFee] = useState<number>(0);
  const [filteredContacts, setFilteredContacts] = useState<any>([]);
  const [isBalancesListOpen, openBalancesList] = useState<boolean>(false);
  const [isContactsListOpen, openContactsList] = useState<boolean>(false);
  const [isHintUnlocked, setHintUnlocked] = useState<boolean>(false);
  const [inputValue, setInputValue] = useState<number | string>();
  const [maxValue, setMaxValue] = useState<number>(
    propsMaxValue ? propsMaxValue : 0,
  );
  const [selected, setSelected] = useState<boolean>(false);
  const [selectedBalance, setSelectedBalance] = useState<any>();
  const [selectedContact, setSelectedContact] = useState<any>();
  const [symbolName, setSymbolName] = useState<string>(
    propsSymbolName ? propsSymbolName : '',
  );
  const [token, setToken] = useState<string>(propsToken ? propsToken : '');
  const [unlocked, setUnlocked] = useState<boolean | undefined>(undefined);
  const [unlockFau, setUnlockFau] = useState<boolean>(false);
  const [value, setValue] = useState<string>(
    localStorage.getItem('walletName') || '',
  );
  const bigNumberMultiplier = Math.pow(10, 18);

  const validateNumbers = useCallback(
    e => {
      if (INPUT_VALIDATION.digits.test(e)) {
        if (e <= maxValue || e === 0) {
          setInputValue(e);
          if (inputValue === undefined && e === 0) {
            setInputValue(0);
          }
          title === 'Deposit'
            ? onChangeAmount(
                +e * bigNumberMultiplier + fee > +maxValue
                  ? +e * bigNumberMultiplier - fee - 2 * ZK_FEE_MULTIPLIER * fee
                  : +e * bigNumberMultiplier,
              )
            : onChangeAmount(
                +e * bigNumberMultiplier + fee > +maxValue
                  ? +e * bigNumberMultiplier - fee
                  : +e * bigNumberMultiplier,
              );
        } else {
          setInputValue(maxValue);
          title === 'Deposit'
            ? onChangeAmount(
                +maxValue * bigNumberMultiplier -
                  fee -
                  2 * ZK_FEE_MULTIPLIER * fee,
              )
            : onChangeAmount(+maxValue * bigNumberMultiplier - fee);
        }
      }
    },
    [
      bigNumberMultiplier,
      fee,
      inputValue,
      maxValue,
      onChangeAmount,
      setInputValue,
      title,
    ],
  );

  const arr: any = localStorage.getItem(`contacts${zkWallet?.address()}`);
  const contacts = JSON.parse(arr);

  const handleFilterContacts = useCallback(
    e => {
      const searchValue = contacts.filter(el => {
        return el.name.toLowerCase().includes(e.toLowerCase());
      });
      setFilteredContacts(searchValue);
    },
    [addressValue, contacts, setFilteredContacts],
  );

  const handleCancel = useCallback(() => {
    setTransactionType(undefined);
    setHash('');
    setExecuted(false);
    setWalletAddress([]);
    setLoading(false);
  }, [setExecuted, setHash, setLoading, setTransactionType, setWalletAddress]);

  const setWalletName = useCallback(() => {
    if (value && value !== ethId) {
      localStorage.setItem('walletName', value);
    } else {
      setValue(localStorage.getItem('walletName') || ethId);
    }
  }, [ethId, value]);

  const handleSelect = useCallback(
    name => {
      if (isContactsListOpen) {
        setSelectedContact(name);
      }
      if (isBalancesListOpen) {
        setSelectedBalance(name);
      }
    },
    [isBalancesListOpen, isContactsListOpen, onChangeAddress],
  );

  const handleClickOutside = useCallback(
    e => {
      if (e.target.getAttribute('data-name')) {
        e.stopPropagation();
        openContactsList(false);
        openBalancesList(false);
        body?.classList.remove('fixed-b');
      }
    },
    [body],
  );

  const handleSave = useCallback(() => {
    if (addressValue && ADDRESS_VALIDATION['eth'].test(addressValue)) {
      setModal('add-contact');
    } else {
      setError(
        `Error: "${addressValue}" doesn't match ethereum address format`,
      );
    }
  }, [addressValue, setError, setModal]);

  const handleUnlock = useCallback(async () => {
    const changePubkey = await zkWallet?.setSigningKey();
    const receipt = await changePubkey?.awaitReceipt();
    setUnlocked(!!receipt);
  }, [zkWallet]);

  useEffect(() => {
    if (token && token === 'ETH') {
      setUnlockFau(true);
    }
    if (!!hintModal.length) {
      setTimeout(() => {
        setHintModal('');
      }, 5000);
    }
    if (title === 'Withdraw' && zkWallet) {
      setWalletAddress(['You', zkWallet?.address()]);
      onChangeAddress(zkWallet?.address());
    }
    if (token && zkWallet && token !== 'ETH') {
      zkWallet.isERC20DepositsApproved(token).then(res => setUnlockFau(res));
    }
    ethers
      .getDefaultProvider()
      .getGasPrice()
      .then(res => res.toString())
      .then(data => setFee(+data));
    zkWallet
      ?.getAccountState()
      .then(res =>
        !!res.id
          ? zkWallet?.isSigningKeySet().then(data => setUnlocked(data))
          : setUnlocked(true),
      );
    document.addEventListener('click', handleClickOutside, true);
    return () => {
      document.removeEventListener('click', handleClickOutside, true);
    };
  }, [
    addressValue,
    balances,
    body,
    fee,
    handleClickOutside,
    isBalancesListOpen,
    isContactsListOpen,
    onChangeAddress,
    selected,
    setUnlockFau,
    setWalletAddress,
    title,
    unlockFau,
    walletAddress,
    zkWallet,
  ]);

  const handleShowHint = useCallback(() => {
    setHintUnlocked(true);
    setTimeout(() => {
      setHintUnlocked(false);
    }, 1000);
  }, [setHintUnlocked]);

  const handleUnlockERC = useCallback(() => {
    setLoading(true);
    zkWallet
      ?.approveERC20TokenDeposits(token)
      .then(res => res)
      .then(data => data);
    const setUnlocked = async () => {
      const checkApprove = await zkWallet
        ?.isERC20DepositsApproved(token)
        .then(res => res);
      if (checkApprove) {
        setUnlockFau(checkApprove);
        setLoading(false);
      }
    };
    setUnlocked();
    if (!unlockFau) {
      setInterval(() => {
        setUnlocked();
      }, 3000);
    }
  }, [setUnlockFau, token, unlockFau, zkWallet]);

  const handleInputWidth = useCallback(e => {
    const el = myRef.current;
    if (el) {
      el.style.width = (e.toString().length + 1) * 16 + 'px';
    }
  }, []);

  return (
    <>
      {!!hintModal.length && <div className='hint-modal'>{hintModal}</div>}
      <div
        data-name='modal-wrapper'
        className={`modal-wrapper ${
          isContactsListOpen || isBalancesListOpen ? 'open' : 'closed'
        }`}
      ></div>
      <Modal visible={false} classSpecifier='add-contact' background={true}>
        <SaveContacts
          title='Add contact'
          addressValue={addressValue}
          addressInput={false}
        />
      </Modal>
      <div
        className={`assets-wrapper ${
          isContactsListOpen || isBalancesListOpen ? 'open' : 'closed'
        }`}
      >
        {isContactsListOpen && (
          <DataList
            setValue={setContacts}
            dataProperty={dataPropertyName}
            data={contacts}
            title='Select contact'
            visible={true}
          >
            <button
              onClick={() => {
                openContactsList(false);
                body?.classList.remove('fixed-b');
              }}
              className='close-icon'
            ></button>
            <div className='assets-border-bottom'></div>
            {searchContacts ? (
              searchContacts.map(({ address, name }) => (
                <div
                  className='balances-contact'
                  key={name}
                  onClick={() => {
                    handleSelect(name);
                    setWalletAddress([name, address]);
                    onChangeAddress(address);
                    openContactsList(false);
                    body?.classList.remove('fixed-b');
                  }}
                >
                  <div className='balances-contact-left'>
                    <p className='balances-contact-name'>{name}</p>
                    <span className='balances-contact-address'>
                      {window?.innerWidth > WIDTH_BP
                        ? address
                        : address?.replace(
                            address?.slice(14, address?.length - 4),
                            '...',
                          )}
                    </span>
                  </div>
                  <div className='balances-contact-right'>
                    <></>
                  </div>
                </div>
              ))
            ) : (
              <div>You don't have contacts yet...</div>
            )}
          </DataList>
        )}
        {isBalancesListOpen && (
          <DataList
            setValue={setBalances}
            dataProperty={dataPropertySymbol}
            data={balances}
            title='Select asset'
            visible={true}
          >
            <button
              onClick={() => {
                openBalancesList(false);
                body?.classList.remove('fixed-b');
              }}
              className='close-icon'
            ></button>
            {!!searchBalances.length ? (
              searchBalances.map(({ address, symbol, balance }) => (
                <div
                  onClick={() => {
                    setToken(!!+address ? address : symbol);
                    setMaxValue(balance);
                    setSymbolName(symbol);
                    setSymbol(symbol);
                    handleSelect(symbol);
                    openBalancesList(false);
                    setSelected(true);
                    body?.classList.remove('fixed-b');
                  }}
                  key={address}
                  className='balances-token'
                >
                  <div className='balances-token-left'>
                    <div className={`logo ${symbol}`}></div>
                    <div className='balances-token-name'>
                      <p>{symbol}</p>
                      <span>
                        {symbol === 'ETH' && <>Ethereum</>}
                        {symbol === 'DAI' && <>Dai</>}
                        {symbol === 'FAU' && <>Faucet</>}
                      </span>
                    </div>
                  </div>
                  <div className='balances-token-right'>
                    <span>
                      balance:{' '}
                      <p className='datalist-balance'>
                        {parseFloat(balance.toFixed(8).toString())}
                      </p>
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p>
                No balances yet, please make a deposit or request money from
                someone!
              </p>
            )}
          </DataList>
        )}
      </div>
      <div className='transaction-wrapper'>
        {isExecuted ? (
          <>
            <button
              onClick={() => {
                handleCancel();
              }}
              className='transaction-back'
            ></button>
            <h2 className='transaction-title'>{title} successful!</h2>
            <span className='transaction-field-title'>
              {title === 'Send' && <>Transfered into</>}
              {title === 'Withdraw' && <>Withdrawn from</>}
              {title === 'Deposit' && <>Deposited to</>} zkSync:{' '}
              <p className='transaction-field-amount'>
                {inputValue} {symbolName}
              </p>
            </span>
            <p className='transaction-hash'>
              {'Tx hash: '}
              <a
                target='_blank'
                href={`${ZK_EXPLORER}/${
                  typeof hash === 'string' ? hash : hash?.hash
                }`}
              >
                {typeof hash === 'string' ? hash : hash?.hash}
              </a>
            </p>
            <button
              className='btn submit-button'
              onClick={() => {
                handleCancel();
                setWalletAddress([]);
                setTransactionType(undefined);
              }}
            >
              Go to my wallet
            </button>
          </>
        ) : (
          <>
            {unlocked === undefined || isLoading ? (
              <>
                {isLoading && (
                  <>
                    <h1>{isLoading && !unlockFau ? 'Unlocking' : title}</h1>
                    <p>Follow the instructions in the popup</p>
                    <Spinner />
                    <button
                      className='btn submit-button'
                      onClick={() => {
                        handleCancel();
                        setWalletName();
                      }}
                    >
                      Cancel
                    </button>
                  </>
                )}
                {unlocked === undefined && (
                  <>
                    <Spinner />
                    <button
                      className='btn submit-button'
                      onClick={() => {
                        handleCancel();
                        setWalletName();
                      }}
                    >
                      Cancel
                    </button>
                  </>
                )}
              </>
            ) : (
              <>
                <button
                  onClick={() => {
                    handleCancel();
                    setWalletAddress([]);
                    setTransactionType(undefined);
                  }}
                  className='transaction-back'
                ></button>
                <h2 className='transaction-title'>{title}</h2>
                {unlocked || title === 'Deposit' ? (
                  <>
                    {searchBalances.length || title === 'Deposit' ? (
                      <>
                        {isInput && (
                          <>
                            <span className='transaction-field-title'>
                              To address
                            </span>
                            <div
                              className={`transaction-field contacts ${ADDRESS_VALIDATION[
                                'eth'
                              ].test(addressValue)}`}
                            >
                              <div
                                className='custom-selector contacts'
                                onClick={() => {
                                  openContactsList(!isContactsListOpen);
                                  body?.classList.add('fixed-b');
                                }}
                              >
                                <div className='custom-selector-title'>
                                  <p>
                                    {walletAddress[0]
                                      ? walletAddress[0]
                                      : selectedContact}
                                  </p>
                                  {selectedContact ||
                                    (walletAddress[0] && (
                                      <div className='arrow-down'></div>
                                    ))}
                                </div>
                              </div>
                              <div className='currency-input-wrapper'>
                                {ADDRESS_VALIDATION['eth'].test(
                                  addressValue,
                                ) && <span className='label-done'></span>}
                                <input
                                  placeholder='Ox address or contact name'
                                  value={
                                    title === 'Withdraw'
                                      ? zkWallet?.address()
                                      : addressValue
                                  }
                                  onChange={e => {
                                    onChangeAddress(e.target.value);
                                    handleFilterContacts(e.target.value);
                                    setWalletAddress([]);
                                  }}
                                  className='currency-input-address'
                                />
                                {ADDRESS_VALIDATION['eth'].test(addressValue) &&
                                  !walletAddress.length && (
                                    <button
                                      className='add-contact-button-input btn-tr'
                                      onClick={() => handleSave()}
                                    >
                                      <span></span>
                                      <p>Save</p>
                                    </button>
                                  )}
                                {((!addressValue && !walletAddress[1]) ||
                                  (!addressValue && walletAddress[1]) ||
                                  !addressValue ||
                                  walletAddress[1]) &&
                                !selectedContact ? (
                                  <div
                                    className={`custom-selector contacts ${
                                      selectedContact &&
                                      addressValue === walletAddress[1]
                                        ? ''
                                        : 'short'
                                    }`}
                                  >
                                    <div
                                      onClick={() => {
                                        openContactsList(!isContactsListOpen);
                                        body?.classList.add('fixed-b');
                                      }}
                                      className={`custom-selector-title ${
                                        selectedContact &&
                                        addressValue === walletAddress[1]
                                          ? ''
                                          : 'short'
                                      }`}
                                    >
                                      {(selectedContact || !walletAddress[0]) &&
                                      addressValue === walletAddress[1] ? (
                                        <p>{selectedContact}</p>
                                      ) : (
                                        <span></span>
                                      )}
                                      <div className='arrow-down'></div>
                                    </div>
                                  </div>
                                ) : (
                                  <button
                                    className='cross-clear'
                                    onClick={() => {
                                      onChangeAddress('');
                                      handleFilterContacts('');
                                      setWalletAddress([]);
                                      setSelectedContact('');
                                    }}
                                  ></button>
                                )}
                              </div>
                            </div>
                            {!!filteredContacts.length &&
                              addressValue &&
                              !walletAddress[1] && (
                                <div className='transaction-contacts-list'>
                                  {filteredContacts.map(({ name, address }) => (
                                    <div
                                      className='balances-contact'
                                      key={name}
                                      onClick={() => {
                                        handleSelect(name);
                                        setWalletAddress([name, address]);
                                        onChangeAddress(address);
                                        openContactsList(false);
                                        setSelectedContact(name);
                                        body?.classList.remove('fixed-b');
                                        setFilteredContacts([]);
                                      }}
                                    >
                                      <div className='balances-contact-left'>
                                        <p className='balances-contact-name'>
                                          {name}
                                        </p>
                                        <span className='balances-contact-address'>
                                          {window?.innerWidth > WIDTH_BP
                                            ? address
                                            : address?.replace(
                                                address?.slice(
                                                  14,
                                                  address?.length - 4,
                                                ),
                                                '...',
                                              )}
                                        </span>
                                      </div>
                                      <div className='balances-contact-right'>
                                        <></>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                          </>
                        )}
                        <span className='transaction-field-title'>
                          Amount / asset
                        </span>
                        <div className='transaction-field balance'>
                          <div className='currency-input-wrapper border'>
                            <div className='scroll-wrapper'>
                              <input
                                placeholder='0.00'
                                className='currency-input'
                                type='number'
                                ref={myRef}
                                onChange={e => {
                                  validateNumbers(+e.target.value);
                                  setAmount(+e.target.value);
                                  handleInputWidth(+e.target.value);
                                  setInputValue(e.target.value);
                                  if (+e.target.value > maxValue) {
                                    setInputValue(maxValue);
                                    handleInputWidth(maxValue);
                                  }
                                }}
                                value={
                                  inputValue
                                    ? parseFloat(
                                        parseFloat(inputValue?.toString())
                                          .toFixed(18)
                                          .toString(),
                                      )
                                    : ''
                                }
                              />
                            </div>

                            <div className='custom-selector balances'>
                              <div
                                onClick={() => {
                                  openBalancesList(!isBalancesListOpen);
                                  body?.classList.add('fixed-b');
                                }}
                                className='custom-selector-title'
                              >
                                {symbolName ? (
                                  <p>{symbolName}</p>
                                ) : (
                                  <span>
                                    {zkBalancesLoaded ? (
                                      'Select token'
                                    ) : (
                                      <Spinner />
                                    )}
                                  </span>
                                )}

                                <div className='arrow-down'></div>
                              </div>
                            </div>
                          </div>
                          {zkBalancesLoaded &&
                            (!!balances?.length ? (
                              <div
                                className='currency-input-wrapper'
                                key={token}
                              >
                                <div className='all-balance-wrapper'>
                                  <button
                                    className='all-balance btn-tr'
                                    onClick={() => {
                                      setInputValue(+maxValue);
                                      onChangeAmount(
                                        (+maxValue - 0.0003) *
                                          bigNumberMultiplier -
                                          2 * ZK_FEE_MULTIPLIER * fee,
                                      );
                                      handleInputWidth(maxValue);
                                    }}
                                  >
                                    Max: {maxValue ? maxValue.toFixed(6) : '0'}{' '}
                                    {symbolName ? symbolName : ''}
                                  </button>
                                </div>
                                <span>
                                  ~$
                                  {
                                    +(
                                      +(price && !!price[selectedBalance]
                                        ? price[selectedBalance]
                                        : 1) * (maxValue ? maxValue : 0)
                                    ).toFixed(2)
                                  }
                                </span>
                              </div>
                            ) : (
                              <div
                                className='currency-input-wrapper'
                                key={token}
                              >
                                <span>You have no balances</span>
                              </div>
                            ))}
                        </div>
                        {title === 'Deposit' &&
                          token !== 'ETH' &&
                          selectedBalance && (
                            <>
                              <div
                                className={`hint-unlocked ${isHintUnlocked}`}
                              >
                                Already unlocked. This only needs to be done
                                once per token.
                              </div>
                              <div className='fau-unlock-wrapper'>
                                {unlockFau ? (
                                  <p>
                                    {symbolName.length
                                      ? symbolName
                                      : balances?.length &&
                                        balances[0].symbol}{' '}
                                    token unlocked
                                  </p>
                                ) : (
                                  <p>
                                    Unlock{' '}
                                    {symbolName.length
                                      ? symbolName
                                      : balances?.length &&
                                        balances[0].symbol}{' '}
                                    token
                                  </p>
                                )}
                                <button
                                  onClick={() =>
                                    !unlockFau
                                      ? handleUnlockERC()
                                      : handleShowHint()
                                  }
                                  className={`fau-unlock-tocken ${unlockFau}`}
                                >
                                  <span
                                    className={`fau-unlock-tocken-circle ${unlockFau}`}
                                  ></span>
                                </button>
                              </div>
                            </>
                          )}
                        <button
                          className={`btn submit-button ${
                            !unlockFau && title === 'Deposit' ? 'disabled' : ''
                          }`}
                          onClick={() =>
                            unlockFau
                              ? selectedBalance && inputValue && +inputValue > 0
                                ? transactionAction(token, type)
                                : setError(
                                    'Please select token and amount value',
                                  )
                              : undefined
                          }
                        >
                          <span
                            className={`submit-label ${title} ${
                              !unlockFau && title === 'Deposit'
                                ? unlockFau
                                : true
                            }`}
                          ></span>
                          {title}
                        </button>
                        <p key={maxValue} className='transaction-fee'>
                          Fee:{' '}
                          {balances?.length && (
                            <span>
                              {amount < maxValue
                                ? parseFloat(
                                    (amount * 0.001).toFixed(10).toString(),
                                  )
                                : parseFloat(
                                    (maxValue * 0.001).toFixed(10).toString(),
                                  )}{' '}
                              {symbolName ? symbolName : balances[0].symbol}
                            </span>
                          )}
                        </p>
                      </>
                    ) : (
                      <>
                        <p>
                          No balances yet, please make a deposit or request
                          money from someone!
                        </p>
                        <button
                          className='btn submit-button'
                          onClick={() => setTransactionType('deposit')}
                        >
                          Deposit
                        </button>
                      </>
                    )}
                  </>
                ) : (
                  <>
                    <div className='info-block center'>
                      <p>
                        To control your account you need to unlock it once by
                        registering your public key.
                      </p>
                    </div>
                    <button
                      className='btn submit-button'
                      onClick={handleUnlock}
                    >
                      <span className='submit-label unlock'></span>
                      Unlock
                    </button>
                  </>
                )}
              </>
            )}
          </>
        )}
      </div>
    </>
  );
};

export default Transaction;
