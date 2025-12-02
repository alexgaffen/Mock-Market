// src/Portfolio.js
import React, { useState, useEffect } from 'react';
import { auth, firestore } from './firebase';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import axios from 'axios';
import Notification from './Notification';

// --- Sell Window (Modal) ---
function SellModal({ item, currentPrice, onClose, onConfirm }) {
    const [qty, setQty] = useState(1);
    
    const maxQty = parseInt(item.quantity);
    const sellValue = qty * currentPrice;
    const costBasis = qty * parseFloat(item.purchasePrice);
    const profitLoss = sellValue - costBasis;
    const isProfit = profitLoss >= 0;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" style={{
                maxWidth: '500px', 
                padding: '30px', 
                height: 'auto',       
                maxHeight: '90vh',    
                overflowY: 'auto'     
            }} onClick={(e) => e.stopPropagation()}>
                
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'25px'}}>
                    <div>
                         <h2 style={{margin:0, border:'none', fontSize:'1.8rem', lineHeight: 1}}>Sell {item.symbol}</h2>
                         <div style={{fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '5px'}}>Available: {maxQty}</div>
                    </div>
                    <button onClick={onClose} className="modal-close-btn" style={{position:'static', fontSize:'2.5rem', lineHeight: 0.6}}>×</button>
                </div>

                <div style={{background: 'var(--bg-input)', padding: '20px', borderRadius: '12px', marginBottom: '25px', display: 'flex', justifyContent: 'space-between', border: '1px solid var(--border)'}}>
                    <div>
                        <div style={{fontSize: '0.85rem', color: 'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.05em'}}>Market Price</div>
                        <div style={{fontSize: '1.4rem', fontWeight: 'bold', color: 'var(--text-main)'}}>${currentPrice.toFixed(2)}</div>
                    </div>
                    <div style={{textAlign: 'right'}}>
                        <div style={{fontSize: '0.85rem', color: 'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.05em'}}>Avg Cost</div>
                        <div style={{fontSize: '1.4rem', fontWeight: '600'}}>${parseFloat(item.purchasePrice).toFixed(2)}</div>
                    </div>
                </div>

                <div style={{marginBottom: '30px'}}>
                    <div style={{display:'flex', justifyContent:'space-between', marginBottom:'10px'}}>
                        <label style={{color: 'var(--text-main)', fontWeight:'600'}}>Quantity to Sell</label>
                    </div>
                    
                    <div style={{display: 'flex', gap: '15px', alignItems: 'center'}}>
                        <input 
                            className="input" 
                            type="number" 
                            autoFocus
                            min="1" 
                            max={maxQty}
                            value={qty}
                            onChange={(e) => setQty(Math.min(maxQty, Math.max(1, parseInt(e.target.value) || 0)))}
                            style={{fontSize: '1.5rem', padding: '10px', width: '120px', textAlign: 'center', fontWeight: 'bold'}}
                        />
                        <input 
                            type="range" 
                            min="1" 
                            max={maxQty} 
                            value={qty} 
                            onChange={(e) => setQty(parseInt(e.target.value))}
                            style={{flex: 1, accentColor: 'var(--primary)', height: '8px'}}
                        />
                    </div>
                </div>

                <div style={{borderTop: '1px solid var(--border)', paddingTop: '25px', marginBottom: '25px'}}>
                    <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '8px'}}>
                        <span style={{fontSize: '1.1rem', color: 'var(--text-muted)'}}>Total Sale Value</span>
                        <span style={{fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--success)'}}>
                            ${sellValue.toLocaleString(undefined, {minimumFractionDigits: 2})}
                        </span>
                    </div>
                    
                    <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '1rem'}}>
                        <span style={{color: 'var(--text-muted)'}}>Realized P/L</span>
                        <span style={{fontWeight: '600', color: isProfit ? 'var(--profit)' : 'var(--danger)'}}>
                            {isProfit ? '+' : ''}{profitLoss.toFixed(2)}
                        </span>
                    </div>
                </div>

                <div style={{display: 'flex', gap: '15px'}}>
                    <button className="btn btn-outline" style={{flex: 1, height: '45px'}} onClick={onClose}>Cancel</button>
                    <button className="btn btn-danger" style={{flex: 2, height: '45px', fontSize: '1.1rem'}} onClick={() => onConfirm(qty)}>
                        Confirm Sell
                    </button>
                </div>
            </div>
        </div>
    );
}

// --- Main Portfolio Component ---
function Portfolio() {
  const [userData, setUserData] = useState(null);
  const [stockPrices, setStockPrices] = useState({});
  const [stockLogos, setStockLogos] = useState({});
  const [sellModalData, setSellModalData] = useState(null);
  
  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredPortfolio, setFilteredPortfolio] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  const [notification, setNotification] = useState(null);

  const INITIAL_CAPITAL = 100000;

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      if (user) {
        const userRef = doc(firestore, 'users', user.uid);
        const unsubscribeSnapshot = onSnapshot(userRef, (docSnap) => {
          if (docSnap.exists()) {
              const data = docSnap.data();
              setUserData(data);
              // Initialize filtered list with all items if not actively searching
              if (!searchQuery) {
                  setFilteredPortfolio(data.portfolio || []);
              }
          }
        });
        return () => unsubscribeSnapshot();
      }
    });
    return () => unsubscribeAuth();
  }, []); 

  // Helper to filter portfolio locally and via API
  const handlePortfolioSearch = async () => {
      if (!userData?.portfolio) return;
      
      const query = searchQuery.trim();
      
      // 1. If empty, show all
      if (!query) {
          setFilteredPortfolio(userData.portfolio);
          return;
      }

      setIsSearching(true); 

      // 2. Local Filter (Direct Symbol Match - Case Insensitive)
      let matchedItems = userData.portfolio.filter(item => 
          item.symbol.toUpperCase().includes(query.toUpperCase())
      );
      
      // 3. API Search (Smart Match - e.g. "Apple" -> finds "AAPL")
      try {
          const res = await axios.get(`http://localhost:5000/api/search`, { params: { query } });
          const apiResults = res.data.result || [];
          
          // Get normalized list of symbols that matched from API
          // We check both 'symbol' and 'displaySymbol' to be safe
          const apiSymbols = new Set(
              apiResults.flatMap(r => [r.symbol, r.displaySymbol])
                        .filter(Boolean)
                        .map(s => s.toUpperCase())
          );
          
          // Find items in our portfolio that match these API symbols
          // AND aren't already in our matched list
          const smartMatches = userData.portfolio.filter(item => {
              const itemSym = item.symbol.toUpperCase();
              // Check if this portfolio item is in the API results
              const isApiMatch = apiSymbols.has(itemSym);
              // Check if we already added it via local filter
              const isAlreadyAdded = matchedItems.some(m => m.symbol.toUpperCase() === itemSym);
              
              return isApiMatch && !isAlreadyAdded;
          });
          
          matchedItems = [...matchedItems, ...smartMatches];
          
      } catch (error) {
          console.error("Search API failed, using local filter only", error);
      }

      setFilteredPortfolio(matchedItems);
      setIsSearching(false); 
  };

  const onSearchKey = (e) => {
      if (e.key === 'Enter') handlePortfolioSearch();
  };

  const onSearchChange = (e) => {
      const val = e.target.value;
      setSearchQuery(val);
      if (val === '') {
          setFilteredPortfolio(userData?.portfolio || []);
      }
  };

  // Fetch Prices and Logos
  useEffect(() => {
    if (userData?.portfolio?.length > 0) {
      
      const fetchPrices = () => {
        userData.portfolio.forEach(async (item) => {
          try {
            const res = await axios.get(`http://localhost:5000/api/quote`, { params: { symbol: item.symbol } });
            setStockPrices(prev => ({ ...prev, [item.symbol]: res.data.c }));
          } catch (e) {}
        });
      };

      const fetchLogos = () => {
        userData.portfolio.forEach(async (item) => {
            if (stockLogos[item.symbol]) return; 
            try {
                const res = await axios.get(`http://localhost:5000/api/profile`, { params: { symbol: item.symbol } });
                if (res.data.logo) {
                    setStockLogos(prev => ({ ...prev, [item.symbol]: res.data.logo }));
                }
            } catch (e) {}
        });
      };

      fetchPrices();
      fetchLogos(); 

      const interval = setInterval(fetchPrices, 60000);
      return () => clearInterval(interval);
    }
  }, [userData, stockLogos]);

  const calculateValuations = () => {
    let currentVal = 0;
    if (userData?.portfolio) {
      userData.portfolio.forEach(item => {
        const price = parseFloat(stockPrices[item.symbol] || 0);
        currentVal += (Number(item.quantity) * price);
      });
    }
    return currentVal;
  };

  const initiateSell = (item, index) => {
      const currentPrice = parseFloat(stockPrices[item.symbol] || 0);
      if(!currentPrice) { 
          setNotification({message: "Price loading...", type: "info"});
          return; 
      }
      setSellModalData({ item, index, currentPrice });
  };

  const executeSell = async (qtyToSell) => {
    if (!userData || !sellModalData) return;
    const { item, index, currentPrice } = sellModalData;
    const saleValue = qtyToSell * currentPrice;
    const newBalance = Number(userData.balance) + saleValue;
    
    let newPortfolio = [...userData.portfolio];
    if (Number(qtyToSell) === Number(item.quantity)) {
        newPortfolio.splice(index, 1);
    } else {
        newPortfolio[index] = { ...item, quantity: item.quantity - qtyToSell };
    }

    try {
        await updateDoc(doc(firestore, 'users', auth.currentUser.uid), {
            balance: newBalance,
            portfolio: newPortfolio
        });
        setNotification({
            message: `Successfully sold ${qtyToSell} share${qtyToSell > 1 ? 's' : ''} of ${item.symbol}`, 
            type: "success"
        });
        setSellModalData(null);
        // Refresh filter
        setFilteredPortfolio(newPortfolio); 
    } catch (e) {
        setNotification({message: "Trade failed.", type: "error"});
    }
  };

  if (!userData) return <div className="card"><p>Loading...</p></div>;

  const currentValuation = calculateValuations();
  const netWorth = Number(userData.balance) + currentValuation;
  const totalGain = netWorth - INITIAL_CAPITAL;
  const totalGainPercent = (totalGain / INITIAL_CAPITAL) * 100;
  const isProfit = totalGain >= 0;

  return (
    <>
        {notification && <Notification message={notification.message} type={notification.type} onClose={() => setNotification(null)} />}

        <div className="card-themed">
            <div style={{
                display:'flex', 
                justifyContent:'space-between', 
                alignItems:'center', 
                marginBottom: '20px', 
                borderBottom: '2px solid var(--primary)', /* Themed Line */
                paddingBottom: '10px'
            }}>
                <h2 style={{margin:0, border: 'none', padding: 0}}>Your Portfolio</h2>
            </div>
            
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-label">Net Worth</div>
                    <div className="stat-value">${netWorth.toLocaleString(undefined, {minimumFractionDigits: 2})}</div>
                    <div style={{ fontSize: '0.85rem', marginTop: '4px', fontWeight: '600', color: isProfit ? 'var(--profit)' : 'var(--danger)' }}>
                        {isProfit ? '+' : ''}{totalGain.toLocaleString(undefined, {minimumFractionDigits: 2})} ({isProfit ? '+' : ''}{totalGainPercent.toFixed(2)}%)
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-label">Cash Balance</div>
                    <div className="stat-value" style={{color: 'var(--success)'}}>${Number(userData.balance).toLocaleString(undefined, {minimumFractionDigits: 2})}</div>
                </div>
                <div className="stat-card">
                    <div className="stat-label">Stock Value</div>
                    <div className="stat-value" style={{color: 'var(--primary)'}}>${currentValuation.toLocaleString(undefined, {minimumFractionDigits: 2})}</div>
                </div>
            </div>

            {/* PORTFOLIO SEARCH BAR */}
            <div style={{ display: 'flex', marginBottom: '20px' }}>
                <input 
                    className="input" 
                    type="text" 
                    placeholder="Search Owned Stocks (e.g., 'Apple' or 'AAPL')" 
                    value={searchQuery} 
                    onChange={onSearchChange} 
                    onKeyDown={onSearchKey} 
                />
                <button 
                    className="btn btn-primary" 
                    onClick={handlePortfolioSearch}
                    disabled={isSearching}
                    style={{ minWidth: '100px' }}
                >
                    {isSearching ? "..." : "Search"}
                </button>
            </div>

            {/* SCROLLABLE TABLE CONTAINER - UPDATED HEIGHT 70vh */}
            <div className="table-responsive" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                {filteredPortfolio && filteredPortfolio.length > 0 ? (
                <table className="styled-table">
                    <thead>
                    <tr>
                        <th>Symbol</th>
                        <th>Owned</th>
                        <th>Avg Cost</th>
                        <th>Current Price</th>
                        <th>Total Equity</th>
                        <th>Action</th>
                    </tr>
                    </thead>
                    <tbody>
                    {filteredPortfolio.map((item, index) => {
                        const price = parseFloat(stockPrices[item.symbol] || 0);
                        const quantity = Number(item.quantity);
                        const costBasis = Number(item.purchasePrice) * quantity;
                        const equity = price * quantity;
                        
                        const unrealizedGain = equity - costBasis;
                        const unrealizedGainPercent = costBasis !== 0 ? (unrealizedGain / costBasis) * 100 : 0;
                        const isGain = unrealizedGain >= 0;

                        return (
                            <tr key={index}>
                                <td>
                                    <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                                        {stockLogos[item.symbol] ? (
                                            <img src={stockLogos[item.symbol]} alt={item.symbol} className="stock-logo-small" />
                                        ) : (
                                            <div className="stock-logo-placeholder" style={{width: '24px', height:'24px', fontSize:'0.7rem'}}>
                                                {item.symbol[0]}
                                            </div>
                                        )}
                                        <strong>{item.symbol}</strong>
                                    </div>
                                </td>
                                <td>{item.quantity}</td>
                                <td>${Number(item.purchasePrice).toFixed(2)}</td>
                                <td>{price ? `$${price.toFixed(2)}` : '...'}</td>
                                
                                <td>
                                    <div style={{fontWeight: 'bold', color: 'var(--text-main)'}}>
                                        ${equity.toLocaleString(undefined, {minimumFractionDigits: 2})}
                                    </div>
                                    <div style={{fontSize: '0.8rem', fontWeight: '600', color: isGain ? 'var(--profit)' : 'var(--danger)'}}>
                                        {isGain ? '+' : ''}{unrealizedGainPercent.toFixed(2)}%
                                    </div>
                                </td>
                                
                                <td>
                                    <button 
                                        className="btn btn-danger" 
                                        style={{padding: '6px 12px', fontSize: '0.8rem'}} 
                                        onClick={() => initiateSell(item, index)}
                                    >
                                        Sell
                                    </button>
                                </td>
                            </tr>
                        );
                    })}
                    </tbody>
                </table>
                ) : (
                <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px' }}>
                    {searchQuery ? "No stocks match your search." : "Your portfolio is empty. Buy some stocks!"}
                </p>
                )}
            </div>
        </div>

        {sellModalData && (
            <SellModal 
                item={sellModalData.item} 
                currentPrice={sellModalData.currentPrice}
                onClose={() => setSellModalData(null)}
                onConfirm={executeSell}
            />
        )}
    </>
  );
}

export default Portfolio;