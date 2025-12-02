// src/StockSearch.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { auth, firestore } from './firebase';
import { doc, onSnapshot, updateDoc, getDoc } from 'firebase/firestore';
import Typewriter from './Typewriter'; 
import Notification from './Notification';

// --- HELPER: Signal Color Logic ---
const getSignalColor = (signal) => {
    if (!signal) return 'var(--text-muted)';
    const s = signal.toUpperCase();
    if (s.includes('BUY')) return 'var(--profit)'; 
    if (s.includes('SELL')) return 'var(--danger)'; 
    return 'var(--text-muted)'; 
};

// --- ANALYSIS MODAL ---
function AnalysisModal({ stock, analysis, onClose, onBuy, userBalance, portfolioQty }) {
    const [qty, setQty] = useState(1);
    const price = stock.quote.c;
    const totalCost = qty * price;
    const canAfford = userBalance >= totalCost;
    const maxAffordable = price > 0 ? Math.floor(userBalance / price) : 0;

    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = 'unset'; };
    }, []);

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <div className="modal-header">
                    <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                            {stock.logo && (
                                <img 
                                    src={stock.logo} 
                                    alt={stock.symbol} 
                                    className="stock-logo-large"
                                />
                            )}
                            <h2 style={{ margin: 0, fontSize: '2.5rem', color: 'var(--text-main)', lineHeight: 1 }}>{stock.symbol}</h2>
                            <span className="signal-badge" style={{ 
                                backgroundColor: getSignalColor(analysis.signal),
                                transform: 'translateY(-6px)' 
                            }}>
                                {analysis.signal}
                            </span>
                        </div>
                        <div style={{ fontSize: '1.1rem', color: 'var(--text-muted)', marginTop: '8px' }}>{stock.description}</div>
                    </div>

                    <div style={{ textAlign: 'right', minWidth: '150px' }}>
                         <button onClick={onClose} className="modal-close-btn" title="Close">×</button>
                         <div style={{ fontSize: '2.2rem', fontWeight: 'bold', color: 'var(--primary)', lineHeight: 1, marginTop: '5px' }}>
                            ${price.toFixed(2)}
                         </div>
                         <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '4px' }}>Current Price</div>
                    </div>
                </div>

                <div className="insight-scroll-area">
                    <strong style={{ 
                        display: 'block', 
                        marginBottom: '15px', 
                        color: 'var(--primary)', 
                        fontSize: '1.2rem',
                        borderBottom: '2px solid var(--border)',
                        paddingBottom: '8px'
                    }}>
                        Agent's Quant Analysis & Insights
                    </strong>
                    <div style={{ lineHeight: '1.8', fontSize: '1.05rem', whiteSpace: 'pre-wrap' }}>
                        <Typewriter text={analysis.insight} speed={5} />
                    </div>
                </div>

                <div className="modal-footer">
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px', fontSize: '1rem', color: 'var(--text-muted)' }}>
                        <span>Available Cash: <strong style={{color: 'var(--success)'}}>${userBalance.toLocaleString()}</strong></span>
                        <span>Already Owned: <strong>{portfolioQty} shares</strong></span>
                    </div>

                    <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                        <div style={{ display: 'flex', gap: '15px', alignItems: 'center', flex: 1 }}>
                            <input 
                                className="input" 
                                type="number" 
                                min="1" 
                                max={maxAffordable}
                                value={qty}
                                onChange={(e) => setQty(Math.min(maxAffordable, Math.max(1, parseInt(e.target.value) || 0)))}
                                style={{fontSize: '1.2rem', padding: '8px', width: '80px', textAlign: 'center', fontWeight: 'bold'}}
                            />
                            <input 
                                type="range" 
                                min="1" 
                                max={maxAffordable || 1} 
                                value={qty} 
                                onChange={(e) => setQty(parseInt(e.target.value))}
                                disabled={maxAffordable <= 1}
                                style={{flex: 1, accentColor: 'var(--primary)', height: '8px'}}
                            />
                        </div>
                        
                        <button 
                            className="btn btn-success" 
                            disabled={!canAfford || qty <= 0}
                            onClick={() => onBuy(stock.symbol, qty, price)}
                            style={{ opacity: canAfford ? 1 : 0.5, flex: '0 0 200px', height: '45px', fontSize: '1.1rem' }}
                        >
                            Buy for ${totalCost.toFixed(2)}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// --- STOCK CARD (List Item) ---
function StockCard({ stock, userBalance, portfolioQty, onAnalyze, onBuy, isAnalyzing }) {
    const [quote, setQuote] = useState(null);
    const [profile, setProfile] = useState(null); 
    const [quantity, setQuantity] = useState(1);
    const [loadingPrice, setLoadingPrice] = useState(true);

    useEffect(() => {
        let isMounted = true;
        async function fetchData() {
            try {
                const [quoteRes, profileRes] = await Promise.all([
                    axios.get(`http://localhost:5000/api/quote`, { params: { symbol: stock.symbol } }),
                    axios.get(`http://localhost:5000/api/profile`, { params: { symbol: stock.symbol } })
                ]);
                
                if (isMounted) {
                    setQuote(quoteRes.data);
                    setProfile(profileRes.data);
                    setLoadingPrice(false);
                }
            } catch (err) { 
                if (isMounted) setLoadingPrice(false); 
            }
        }
        fetchData();
        return () => { isMounted = false; };
    }, [stock.symbol]);

    const price = quote?.c || 0;
    const maxAffordable = price > 0 ? Math.floor(userBalance / price) : 0;
    const canAfford = userBalance >= (quantity * price);

    const handleAnalyzeClick = () => {
        onAnalyze({ ...stock, logo: profile?.logo }, price, quote);
    };

    return (
        <div className="result-item">
            <div className="result-header">
                <div style={{display:'flex', alignItems:'center', gap:'12px'}}>
                    {profile?.logo ? (
                        <img src={profile.logo} alt={stock.symbol} className="stock-logo-small" />
                    ) : (
                        <div className="stock-logo-placeholder">{stock.symbol[0]}</div>
                    )}
                    <div>
                        <strong style={{ fontSize: '1.2rem', color: 'var(--text-main)' }}>{stock.symbol}</strong>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{stock.description}</div>
                    </div>
                </div>
                <div style={{textAlign: 'right'}}>
                    {loadingPrice ? <span style={{color:'var(--text-muted)'}}>...</span> : 
                        <div>
                            <div style={{fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--primary)'}}>${price?.toFixed(2)}</div>
                            <div style={{fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px'}}>
                                H: <span style={{color: 'var(--success)'}}>${quote?.h?.toFixed(2)}</span> | L: <span style={{color: 'var(--danger)'}}>${quote?.l?.toFixed(2)}</span>
                            </div>
                        </div>
                    }
                </div>
            </div>

            <div className="action-panel">
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
                    
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flex: 1, minWidth: '180px' }}>
                        <input 
                            className="input" 
                            type="number" 
                            min="1" 
                            max={maxAffordable}
                            value={quantity}
                            onChange={(e) => setQuantity(Math.min(maxAffordable, Math.max(1, parseInt(e.target.value) || 0)))}
                            style={{width: '60px', textAlign: 'center', fontWeight: 'bold'}}
                        />
                        <input 
                            type="range" 
                            min="1" 
                            max={maxAffordable || 1} 
                            value={quantity} 
                            onChange={(e) => setQuantity(parseInt(e.target.value))}
                            disabled={maxAffordable <= 1}
                            style={{flex: 1, accentColor: 'var(--primary)', height: '6px'}}
                        />
                    </div>

                    <button 
                        className="btn btn-success" 
                        disabled={!canAfford || quantity <= 0} 
                        onClick={() => onBuy(stock.symbol, quantity, price)}
                        style={{ opacity: canAfford ? 1 : 0.5, flex: '0 0 auto', minWidth: '80px' }}
                    >
                        Buy
                    </button>
                    
                    <button 
                        className="btn btn-outline" 
                        onClick={handleAnalyzeClick}
                        disabled={isAnalyzing}
                        style={{opacity: isAnalyzing ? 0.6 : 1, cursor: isAnalyzing ? 'wait' : 'pointer', minWidth: '90px'}}
                    >
                        {isAnalyzing ? "..." : "📊 Analyze"}
                    </button>
                </div>
                <div style={{textAlign: 'right', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '8px'}}>
                    Owned: {portfolioQty} | Cost: ${(quantity * price).toFixed(2)}
                </div>
            </div>
        </div>
    );
}

// --- MAIN COMPONENT ---
function StockSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [userBalance, setUserBalance] = useState(0);
  const [portfolio, setPortfolio] = useState([]);

  const [notification, setNotification] = useState(null); 
  const [modalData, setModalData] = useState(null); 
  const [analyzingSymbol, setAnalyzingSymbol] = useState(null); 

  useEffect(() => {
    const user = auth.currentUser;
    if (user) {
        const unsub = onSnapshot(doc(firestore, 'users', user.uid), (doc) => {
            if (doc.exists()) {
                const data = doc.data();
                setUserBalance(data.balance || 0);
                setPortfolio(data.portfolio || []);
            }
        });
        return () => unsub();
    }
  }, []);

  useEffect(() => {
      if (analyzingSymbol) {
          document.body.style.overflow = 'hidden';
      } else {
          document.body.style.overflow = 'unset';
      }
  }, [analyzingSymbol]);

  const getOwnedQty = (symbol) => {
      const item = portfolio.find(p => p.symbol === symbol);
      return item ? parseInt(item.quantity) : 0;
  };

  const handleSearch = async () => {
    try {
      const response = await axios.get(`http://localhost:5000/api/search`, { params: { query } });
      setResults(response.data.result.slice(0, 50) || []);
    } catch (error) { console.error(error); }
  };

  const handleAnalyze = async (stockObj, price, quote) => {
      const symbol = stockObj.symbol;
      setAnalyzingSymbol(symbol); 
      try {
          const res = await axios.get(`http://localhost:5000/api/signal`, { params: { symbol } });
          setModalData({
              stock: { ...stockObj, quote: { c: price, ...quote } },
              analysis: res.data
          });
      } catch (error) { 
          setNotification({message: "Analysis unavailable.", type: "error"});
      } finally {
          setAnalyzingSymbol(null);
      }
  };

  const handleBuy = async (symbol, qty, price) => {
      if (!price) return;
      const totalCost = qty * price;
      
      try {
          const user = auth.currentUser;
          const userRef = doc(firestore, 'users', user.uid);
          const snapshot = await getDoc(userRef);
          
          if (snapshot.exists()) {
              const userData = snapshot.data();
              if (userData.balance < totalCost) { 
                  setNotification({message: "Insufficient funds!", type: "error"});
                  return; 
              }
              const newBalance = userData.balance - totalCost;
              let currentPortfolio = userData.portfolio || [];
              const existingIndex = currentPortfolio.findIndex(p => p.symbol === symbol);
              
              if (existingIndex !== -1) {
                  const oldItem = currentPortfolio[existingIndex];
                  const newQty = parseInt(oldItem.quantity) + parseInt(qty);
                  const newAvgPrice = ((parseInt(oldItem.quantity) * parseFloat(oldItem.purchasePrice)) + totalCost) / newQty;
                  currentPortfolio[existingIndex] = { ...oldItem, quantity: newQty, purchasePrice: newAvgPrice, purchaseDate: new Date().toISOString() };
              } else {
                  currentPortfolio.push({ symbol: symbol, purchaseDate: new Date().toISOString(), purchasePrice: price, quantity: parseInt(qty) });
              }
              
              await updateDoc(userRef, { balance: newBalance, portfolio: currentPortfolio });
              setNotification({
                  message: `Successfully bought ${qty} share${qty > 1 ? 's' : ''} of ${symbol}`, 
                  type: "success"
              });
              if (modalData) setModalData(null); 
          }
      } catch (e) { 
          setNotification({message: "Transaction failed.", type: "error"});
      }
  };

  return (
    <>
      {notification && <Notification message={notification.message} type={notification.type} onClose={() => setNotification(null)} />}

      <div className="card-themed">
        <div style={{
            display: 'flex', 
            justifyContent: 'space-between', 
            marginBottom: '15px',
            borderBottom: '2px solid var(--primary)',
            paddingBottom: '10px'
        }}>
            <h2 style={{margin:0, border:'none', padding:0}}>Buy Stocks</h2>
            <div style={{textAlign: 'right'}}>
                <div style={{fontSize: '0.8rem', color: 'var(--text-muted)'}}>Cash</div>
                <div style={{fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--success)'}}>${userBalance.toLocaleString(undefined, {minimumFractionDigits: 2})}</div>
            </div>
        </div>

        <div style={{ display: 'flex', marginBottom: '20px' }}>
            <input className="input" type="text" placeholder="Search Symbol (e.g., AAPL)" value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearch()} />
            <button className="btn btn-primary" onClick={handleSearch}>Search</button>
        </div>

        {analyzingSymbol && (
            <div style={{
                position: 'fixed', top:0, left:0, right:0, bottom:0, 
                background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
                display:'flex', flexDirection:'column', justifyContent:'center', alignItems:'center', zIndex: 10000,
                color: 'white'
            }}>
                <h3>Analyzing {analyzingSymbol}...</h3>
            </div>
        )}

        <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '15px',
            maxHeight: '85vh',       
            overflowY: 'auto',        
            paddingRight: '5px'
        }}>
            {results.map((stock) => (
                <StockCard 
                    key={stock.symbol} 
                    stock={stock} 
                    userBalance={userBalance} 
                    portfolioQty={getOwnedQty(stock.symbol)}
                    onAnalyze={handleAnalyze}
                    onBuy={handleBuy}
                    isAnalyzing={analyzingSymbol !== null} 
                />
            ))}
        </div>

        {modalData && (
            <AnalysisModal 
                stock={modalData.stock} 
                analysis={modalData.analysis}
                userBalance={userBalance}
                portfolioQty={getOwnedQty(modalData.stock.symbol)}
                onClose={() => setModalData(null)}
                onBuy={handleBuy}
            />
        )}
      </div>
    </>
  );
}

export default StockSearch;