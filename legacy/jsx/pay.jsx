
class QRReader extends React.Component {
    constructor(props) {
        super(props);
        this.onQRCode = this.onQRCode.bind(this);
        this.openQRCamera = this.openQRCamera.bind(this);
    }

    onQRCode(result) {
        this.setState({receiver: result});
    }

    openQRCamera(files) {
        var reader = new FileReader();
        var _this = this;
        reader.onload = function() {
            qrcode.callback = function(res) {
                if(res instanceof Error) {
                alert("No QR code found. Please make sure the QR code is within the camera's frame and try again.");
                } else {
                    _this.onQRCode(JSON.parse(b64DecodeUnicode(res)));
                }
            };
            qrcode.decode(reader.result);
        };
        reader.readAsDataURL(files[0]);
    }
    
    render() {
        return (
        <div>
                <input type="text" size="16" placeholder="Tracking Code" className="qrcode-text"/>
                <label className="qrcode-text-btn">
                <input type="file" accept="image/*" capture="environment"
                onChange={ (e) => this.openQRCamera(e.target.files) } />
                </label>
        </div>
        );
    }
}

class PayInfo extends React.Component {
    constructor(props) {
        super(props);
    }

    render() {
        return (
            <table className="pay-summary mb2">
                <tbody>
                    <tr>
                        <td className="pay-summary-left">Reciever</td>
                        <td className="pay-summary-right">{this.props.metadata.user}</td>
                    </tr>
                    <tr>
                        <td className="pay-summary-left">Price</td>
                        <td className="pay-summary-right">{this.props.metadata.amount} {this.props.metadata.currency}
                            {this.props.metadata.currency == "EUR" && (
                                <span>
                            {"(" + (this.props.metadata.amount / this.props.metadata.rate).toFixed(3) + " STEEM)"}</span>
                            )}
                        </td>
                    </tr>
                    <tr>
                        <td className="pay-summary-left">Exchange Rate</td>
                        <td className="pay-summary-right">1 STEEM = {this.props.metadata.rate} EUR</td>
                    </tr>
                    <tr>
                        <td className="pay-summary-left">메시지</td>
                        <td className="pay-summary-right">{this.props.metadata.message}</td>
                    </tr>
                </tbody>
            </table>
        );
    }
}

class Sender extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            payInfo: JSON.parse(b64DecodeUnicode(this.props.payInfo))
        }
        this.payViaSteemConnect = this.payViaSteemConnect.bind(this);
    }
    
    payViaSteemConnect() {
        var info = this.state.payInfo;
        var amount = (info.currency === "EUR" ? (info.amount / info.rate) : info.amount).toFixed(3);
        var message = "[SteemPay] " + info.message + (info.currency === "EUR" && ", " + info.amount + " EUR (Exchange Rate: " + info.rate + ") ");
        console.log(message);
        
        if (steem_keychain) {
            steem_keychain.requestTransfer('', info.user, amount, message, 'STEEM', function(err, response) {
                console.log(err, response);
                if (err.error == null) {
                } else {          
                }
            });
        } else {
        }
        /*
		var scUrl = "https://steemconnect.com/sign/transfer?to=" + info.user
                + "&amount=" + encodeURIComponent(amount)
                + "&memo=" + encodeURIComponent(message);
       document.location.href = scUrl;
       */   
    }

    render() {
        return (
            <div className="receiver-panel">
                <div className="page-title">Steem pay with keychain</div>
                <PayInfo metadata={this.state.payInfo} />
                <button
                        type="button"
                        className="btn btn-secondary btn-lg btn-block mb-2" data-dismiss="modal"
                        onClick={() => this.payViaSteemConnect()}
                        >Send Steem
                </button>
            </div>
        )
    }
}

// Start reading metadata
var upbeatPriceFeed = (callback) => {
    fetch("https://api.cryptonator.com/api/ticker/steem-eur")
    .then(res => res.json())
    .then(
        (result) => {
	    var average = result.ticker.price;
            callback(average);
        },
        (error) => {
            alert("Critical Error! Please retry later." + error)
        })
    .catch((error) => {
        alert("Critical Error! Please retry later." + error)
    });
};

class PayDetail extends React.Component {
    constructor(props) {
        super(props);
        this.getQR = this.getQR.bind(this);
    }

    getQR(msg) {
        var baseUrl = document.location.href;
        var url = baseUrl + "/?pay=" + b64EncodeUnicode(JSON.stringify(msg));
        console.log(url);
        return "https://chart.googleapis.com/chart?chs=400x400&cht=qr&chl=" + encodeURIComponent(url) + "&choe=UTF-8";
    }

    render() {
        return (<div style={{justifyContent: 'center', alignItems: 'center', textAlign: 'center'}}>
                    <img src={this.getQR(this.props.metadata)}/>
                    <PayInfo metadata={this.props.metadata} />
                    <button
                        type="button"
                        className="btn btn-secondary btn-lg btn-block mb-2" data-dismiss="modal"
                        >Close</button>
                </div>);
    }
}

class Receiver extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            transfer: {},
            qrData: '',
            price: null,
            lastUpdate: null
        };
        this.showQR = this.showQR.bind(this);
        this.upbeatPriceFeed = this.upbeatPriceFeed.bind(this);
    }

    componentDidMount() {
        var _this = this;
        this.upbeatPriceFeed();
    }

    upbeatPriceFeed() {
        fetch("https://api.cryptonator.com/api/ticker/steem-eur")
        .then(res => res.json())
        .then(
        (result) => {
                var date = new Date();		
	        var average = result.ticker.price;
                this.setState({price: (average), lastFeedUpdate: date.toLocaleDateString() + " " + date.toLocaleTimeString()});
            },
            (error) => {
                alert("Critical Error! Please retry later." + error)
		console.log(error);
            })
        .catch((error) => {
            alert("Critical Error! Please retry later." + error)
        });
    }

    showQR() {
        if (!this.receiver.value) {
            alert("Please enter account name.");
            return;
        }
        if (!this.amount.value) {
            alert("Please enter price.");
            return;
        }
        
        if (this.message.value && this.message.value.length > 20) {
            alert("Please enter a message within 20 characters.");
            return;
        }
        var msg = {
            user: this.receiver.value,
            amount: this.amount.value,
            currency: this.currency.value,
            message: this.message.value,
            rate: this.state.price
        };

        ReactDOM.render(
            <PayDetail metadata={msg} />,
            document.getElementById('pay-detail'));
        $('#pay-modal').modal();
    }
    
    render() {
        return (
            <div className="receiver-panel">
                <div className="page-title">
                    Steem pay with keychain
                </div>
                {this.state.price && (
                <div className="price-feed">Upbit 24 Hour Average Price: 1 STEEM = {this.state.price} EUR ({this.state.lastFeedUpdate})</div>
                )}
                <div className="input-group input-group-lg mb-2">
                    <div className="input-group-prepend">
                        <label className="input-group-text" for="inputGroupSelect01">Receiving account</label>
                    </div>
                    <input type="text"
                        className="form-control"
                        ref={(input) => { this.receiver = input; }}
                        placeholder="Recipient's Steem Account"/>
                </div>
                <div className="input-group input-group-lg mb-2">
                    <div className="input-group-prepend">
                        <label className="input-group-text">Price</label>
                    </div>
                    <input type="text"  style={{width:200}}
                        className="form-control"
                        ref={(input) => { this.amount = input; }}
                        placeholder="Price"/>
                    <select className="custom-select form-control"
                        ref={(input) => { this.currency = input; }}>
                        <option value='EUR'>EURO</option>
                    </select>
                </div>
                <div className="input-group input-group-lg mb-2">
                    <div className="input-group-prepend">
                        <label className="input-group-text">Message</label>
                    </div>
                    <input type="text"
                        className="form-control"
                        ref={(input) => { this.message = input; }}
                        placeholder="This message is shown to the sender."/>
                </div>
                <button
                    type="button"
                    className="btn btn-secondary btn-lg btn-block mb-2"
                    onClick={() => this.showQR()}>Complete
                </button>
                {this.state.qrData && (
                    <img src={this.state.qrData}/>
                )}
            </div>
        )
    }
}

class Pay extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            payInfo: getQueryVariable('pay')
        }
    }
    render() {
        console.log(this.state.payInfo);
        return (
            <div className="main-panel">
                {this.state.payInfo ? (
                    <Sender payInfo={this.state.payInfo} />
                ) : (
                    <Receiver />
                )}
            </div>
        )
    }
}

ReactDOM.render(
    <Pay/>,
    document.getElementById('content_area')
);
