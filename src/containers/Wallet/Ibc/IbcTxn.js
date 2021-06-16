import React, {useState} from "react";
import {
    Form,
    Modal,
    OverlayTrigger,
    Popover,
} from "react-bootstrap";
import Icon from "../../../components/Icon";
import transactions from "../../../utils/transactions";
import helper from "../../../utils/helper";
import aminoMsgHelper from "../../../utils/aminoMsgHelper";
import Loader from "../../../components/Loader";
import {connect} from "react-redux";
import config from "../../../config";
import ibcConfig from "../../../ibcConfig";
import {useTranslation} from "react-i18next";
import Select from "@material-ui/core/Select";
import MenuItem from "@material-ui/core/MenuItem";
import ModalViewTxnResponse from "../../Common/ModalViewTxnResponse";
import ModalGasAlert from "../../Gas/ModalGasAlert";
const IBC_CONF = process.env.REACT_APP_IBC_CONFIG;
const IbcTxn = (props) => {
    const {t} = useTranslation();
    const [enteredAmount, setEnteredAmount] = useState('');
    const [amountField, setAmountField] = useState();
    const [chain, setChain] = useState("");
    const [channelID, setChannelID] = useState("");
    const [txResponse, setTxResponse] = useState('');
    const [show, setShow] = useState(true);
    const [memoStatus, setMemoStatus] = useState(false);
    const [keplerError, setKeplerError] = useState( "");
    const [loader, setLoader] = useState(false);
    const [customChain, setCustomChain] = useState(false);
    const [checkAmountError, setCheckAmountError] = useState(false);
    const [token, setToken] = useState("uxprt");
    const [tokenDenom, setTokenDenom] = useState("uxprt");
    const [transferableAmount, setTransferableAmount] = useState(props.transferableAmount);
    const [tokenItem, setTokenItem] = useState({});
    let mode = localStorage.getItem('loginMode');
    let loginAddress = localStorage.getItem('address');
    const [feeModal, setFeeModal] = useState(false);
    const [formData, setFormData] = useState({});

    const handleClose = () => {
        setShow(false);
        setTxResponse('');
    };

    const handleAmountChange = (evt) => {
        setKeplerError('');
        let rex = /^\d*\.?\d{0,2}$/;
        if (rex.test(evt.target.value)) {
            if(tokenDenom === "uxprt") {
                if (props.transferableAmount < (evt.target.value * 1)) {
                    setCheckAmountError(true);
                } else {
                    setCheckAmountError(false);
                }
            }else {
                if (transferableAmount < (evt.target.value * 1)) {
                    setCheckAmountError(true);
                } else {
                    setCheckAmountError(false);
                }
            }
            setEnteredAmount(evt.target.value);
            setAmountField(evt.target.value * 1);
        } else {
            return false;
        }
    };

    const handleSubmit = async event => {
        event.preventDefault();
        if(customChain){
            let channel = event.target.channel.value;
            setChannelID(channel);
        }
        if (mode === "normal") {
            let memo = "";
            if (memoStatus) {
                memo = event.target.memo.value;
            }
            let memoCheck = helper.mnemonicValidation(memo, loginAddress);
            if (memoCheck) {
                setKeplerError(t("MEMO_MNEMONIC_CHECK_ERROR"));
            } else {
                if (chain !== "custom" && !helper.validateAddress(chain.substr(0, chain.indexOf('/')), event.target.address.value)) {
                    setKeplerError(`Enter Valid  Recipient’s Address, address should starts with ${chain.substr(0, chain.indexOf('/'))}`);
                    return ;
                }
                const data = {
                    amount: amountField,
                    denom: tokenDenom,
                    memo: memo,
                    toAddress: event.target.address.value,
                    channelID: customChain ? event.target.channel.value : channelID,
                    modalHeader: "Send Token",
                    formName: "ibc",
                    successMsg: t("SUCCESSFUL_SEND"),
                    failedMsg: t("FAILED_SEND")
                };
                setFormData(data);
                setKeplerError('');
                setShow(true);
                setFeeModal(true);
            }
        } else {
            setKeplerError('');
            setShow(true);
        }

    };
    const handleSubmitKepler = async event => {
        setShow(true);
        setLoader(true);
        event.preventDefault();
        if (chain !== "custom" && !helper.validateAddress(chain.substr(0, chain.indexOf('/')), event.target.address.value)) {
            setLoader(false);
            setKeplerError(`Enter Valid  Recipient’s Address, address should starts with ${chain.substr(0, chain.indexOf('/'))}`);
            return ;
        }
        let inputChannelID = customChain ? event.target.channel.value : channelID;
        console.log(inputChannelID, loginAddress,
            event.target.address.value);
        let msg =  transactions.MakeIBCTransferMsg(inputChannelID, loginAddress,
            event.target.address.value,(amountField * config.xprtValue), undefined, undefined, tokenDenom);
        await msg.then(result => {
            const response = transactions.TransactionWithKeplr( [result],aminoMsgHelper.fee(0, 250000));
            response.then(result => {
                if (result.code !== undefined) {
                    helper.accountChangeCheck(result.rawLog);
                }
                setTxResponse(result);
                setLoader(false);
            }).catch(err => {
                setLoader(false);
                setKeplerError(err.message);
                helper.accountChangeCheck(err.message);
            });
        }).catch(err => {
            setLoader(false);
            setKeplerError(err.response
                ? err.response.data.message
                : err.message);
        });

    };

    if (loader) {
        return <Loader/>;
    }

    const handleMemoChange = () => {
        setMemoStatus(!memoStatus);
    };

    const onChangeSelect = (evt) => {
        setKeplerError('');
        if(evt.target.value === "Custom"){
            setCustomChain(true);
            setChain(evt.target.value);
        }else {
            setCustomChain(false);
            let id = evt.target.value.substr(evt.target.value.indexOf('/') + 1);
            setChannelID(id);
            setChain(evt.target.value);
        }
    };


    const onTokenChangeSelect = (evt) => {
        setToken(evt.target.value);
        if(evt.target.value === 'uxprt'){
            setTokenDenom(evt.target.value);
            setTransferableAmount(props.transferableAmount);
        }
        else {
            props.tokenList.forEach((item) => {
                if(evt.target.value === item.denomTrace){
                    setTokenDenom(item.denom.baseDenom);
                    setTransferableAmount(transactions.XprtConversion(item.amount * 1));
                    setTokenItem(item);
                }
            });
        }
    };

    const popoverMemo = (
        <Popover id="popover-memo" className="pop-custom">
            <Popover.Content>
                {t("MEMO_NOTE")}
            </Popover.Content>
        </Popover>
    );
    const popover = (
        <Popover id="popover">
            <Popover.Content>
                {
                    (chain !== "Custom" && chain !== "")  ?
                        <p>Recipient’s address starts with {chain.substr(0, chain.indexOf('/'))}; for example: {chain.substr(0, chain.indexOf('/'))}108juerwthyqolqewl74kewg882kjuert123kls</p>
                        : ""
                }

            </Popover.Content>
        </Popover>
    );

    const disable = (
        chain === ""
    );

    // const addressValidation = (
    //     if(chain !== "" && chain !== "custom" && helper.validateAddress(chain.substr(0,chain.indexOf('/') )), event.target.address.value){
    //         if(){}
    //     }
    // // if(helper.validateAddress(chain.substr(0,chain.indexOf('/') )), event.target.address.value){}
    // );

    let channels=[];
    if(IBC_CONF === "ibcStaging.json"){
        channels = ibcConfig.testNetChannels;
    }else {
        channels = ibcConfig.mainNetChannels;
    }

    return (
        <div className="send-container">
            <div className="form-section">
                <Form onSubmit={mode === "kepler" ? handleSubmitKepler : handleSubmit}>
                    <div className="form-field">
                        <p className="label">{t("CHAIN")}</p>
                        <Select value={chain} className="validators-list-selection"
                            onChange={onChangeSelect} displayEmpty>
                            <MenuItem value="" key={0}>
                                <em>{t("SELECT_CHAIN")}</em>
                            </MenuItem>
                            {
                                channels.map((channel, index) => {
                                    return (
                                        <MenuItem
                                            key={index + 1}
                                            className=""
                                            value={channel.id}>
                                            {channel.name}
                                        </MenuItem>
                                    );
                                })
                            }
                            <MenuItem
                                key={channels.length + 1}
                                className=""
                                value="Custom">
                                {t("CUSTOM")}
                            </MenuItem>
                        </Select>
                    </div>
                    {
                        customChain ?
                            <>
                                <div className="form-field">
                                    <p className="label info">{t("PORT")}</p>
                                    <Form.Control
                                        type="text"
                                        name="port"
                                        placeholder={t("ENTER_PORT")}
                                        required={true}
                                        defaultValue="transfer"
                                    />
                                </div>
                                <div className="form-field">
                                    <p className="label info">{t("CHANNEL")}</p>
                                    <Form.Control
                                        type="text"
                                        name="channel"
                                        placeholder={t("ENTER_CHANNEL")}
                                        required={true}
                                    />
                                </div>
                            </>
                            : ""
                    }

                    <div className="form-field">
                        <p className="label info">{t("RECIPIENT_ADDRESS")}
                            {(chain !== "Custom" && chain !== "") ?
                                <OverlayTrigger trigger={['hover', 'focus']} placement="bottom" overlay={popover}>
                                    <button className="icon-button info" type="button"><Icon
                                        viewClass="arrow-right"
                                        icon="info"/></button>
                                </OverlayTrigger> :
                                ""
                            }
                        </p>
                        <Form.Control
                            type="text"
                            name="address"
                            placeholder="Enter Recipient's address "
                            required={true}
                        />
                    </div>
                    {mode === "normal" ?
                        <div className="form-field">
                            <p className="label">{t("TOKEN")}</p>
                            <Select value={token} className="validators-list-selection"
                                onChange={onTokenChangeSelect} displayEmpty>
                                {
                                    props.tokenList.map((item, index) => {
                                        if(item.denom === "uxprt"){
                                            return (
                                                <MenuItem
                                                    key={index + 1}
                                                    className=""
                                                    value={item.denom}>
                                                    XPRT
                                                </MenuItem>
                                            );
                                        }
                                        if(item.denom.baseDenom === "uatom"){
                                            return (
                                                <MenuItem
                                                    key={index + 1}
                                                    className=""
                                                    value={item.denomTrace}>
                                                    ATOM
                                                </MenuItem>
                                            );
                                        }
                                    })
                                }
                            </Select>
                        </div>
                        : null
                    }
                    <div className="form-field p-0">
                        <p className="label">{t("AMOUNT")}</p>
                        <div className="amount-field">
                            <Form.Control
                                type="number"
                                min={0}
                                name="amount"
                                placeholder={t("SEND_AMOUNT")}
                                step="any"
                                className={amountField > props.transferableAmount ? "error-amount-field" : ""}
                                value={enteredAmount}
                                onChange={handleAmountChange}
                                required={true}
                            />
                            {
                                tokenDenom === "uxprt" ?
                                    <span className={props.transferableAmount === 0 ? "empty info-data" : "info-data"}><span
                                        className="title">Transferable Balance:</span> <span
                                        className="value"
                                        title={props.transferableAmount}>{props.transferableAmount.toLocaleString()} XPRT</span> </span>
                                    :
                                    <span title={tokenItem.denomTrace} className={transferableAmount === 0 ? "empty info-data" : "info-data"}>
                                        <span
                                            className="title">Transferable Balance:</span> <span
                                            className="value">{transferableAmount.toLocaleString()}  ATOM ( IBC Trace path - {tokenItem.denom.path} , denom: {tokenItem.denom.baseDenom}  )</span> </span>
                            }
                        </div>
                    </div>
                    {mode === "normal" ?
                        <>
                            <div className="memo-container">
                                <div className="memo-dropdown-section">
                                    <p onClick={handleMemoChange} className="memo-dropdown"><span
                                        className="text">{t("ADVANCED")} </span>
                                    {memoStatus ?
                                        <Icon
                                            viewClass="arrow-right"
                                            icon="up-arrow"/>
                                        :
                                        <Icon
                                            viewClass="arrow-right"
                                            icon="down-arrow"/>}

                                    </p>
                                    <OverlayTrigger trigger={['hover', 'focus']}
                                        placement="bottom"
                                        overlay={popoverMemo}
                                        className="pop-custom"
                                    >
                                        <button className="icon-button info" type="button"><Icon
                                            viewClass="arrow-right"
                                            icon="info"/></button>
                                    </OverlayTrigger>
                                </div>

                                {memoStatus ?
                                    <div className="form-field">
                                        <p className="label info">{t("MEMO")}
                                            <OverlayTrigger trigger={['hover', 'focus']} placement="bottom"
                                                overlay={popoverMemo}>
                                                <button className="icon-button info" type="button"><Icon
                                                    viewClass="arrow-right"
                                                    icon="info"/></button>
                                            </OverlayTrigger></p>
                                        <Form.Control
                                            type="text"
                                            name="memo"
                                            placeholder={t("ENTER_MEMO")}
                                            maxLength={200}
                                            required={false}
                                        />
                                    </div>
                                    : ""}
                            </div>

                        </>
                        : null
                    }
                    {keplerError !== '' ?
                        <p className="form-error">{keplerError}</p>
                        : null
                    }
                    <div className="buttons">
                        {mode === "normal"  ?
                            <div className="button-section">
                                <button className="button button-primary"
                                    disabled={disable || checkAmountError || amountField === 0 || props.transferableAmount === 0}
                                >{t("NEXT")}
                                </button>
                            </div>
                            :
                            <button className="button button-primary"
                                disabled={disable || checkAmountError || amountField === 0 || props.transferableAmount === 0}
                            >{t("SUBMIT")}</button>
                        }
                    </div>
                </Form>
            </div>
            {txResponse !== '' ?
                <Modal show={show} onHide={handleClose} backdrop="static" centered className="modal-custom">
                    <ModalViewTxnResponse
                        response = {txResponse}
                        successMsg = {t("SUCCESSFUL_SEND")}
                        failedMsg = {t("FAILED_SEND")}
                        handleClose={handleClose}
                    />
                </Modal>
                : null}

            {feeModal ?
                <Modal show={show} onHide={handleClose} backdrop="static" centered className="modal-custom">
                    <ModalGasAlert
                        amountField={amountField}
                        setShow={setShow}
                        setFeeModal={setFeeModal}
                        formData={formData}
                        handleClose={handleClose}
                    />
                </Modal>
                : null
            }
        </div>
    );
};


const stateToProps = (state) => {
    return {
        balance: state.balance.amount,
        tokenList: state.balance.tokenList,
        transferableAmount: state.balance.transferableAmount,
    };
};

export default connect(stateToProps)(IbcTxn);
