#include <iostream>
#include <vector>
#include <string>
#include <iomanip>
#include <sstream>
#include <cmath>
#include <numeric>
#include <winsock2.h>
#include <ws2tcpip.h>
#include "json.hpp"

#pragma comment(lib, "ws2_32.lib")

using json = nlohmann::json;

class StrategyEngine {
public:
    struct MarketData {
        double rsi;
        double upperBand;
        double lowerBand;
        double sma;
        double currentPrice;
    };

    static double calculateSMA(const std::vector<double>& prices, size_t period) {
        if (prices.size() < period) return 0.0;
        double sum = 0.0;
        for (size_t i = prices.size() - period; i < prices.size(); ++i) {
            sum += prices[i];
        }
        return sum / period;
    }

    static double calculateRSI(const std::vector<double>& prices, int period = 14) {
        if (prices.size() <= period) return 50.0;
        double avgGain = 0.0, avgLoss = 0.0;
        for (int i = 1; i <= period; ++i) {
            double change = prices[i] - prices[i - 1];
            if (change > 0) avgGain += change;
            else avgLoss -= change;
        }
        avgGain /= period;
        avgLoss /= period;
        for (size_t i = period + 1; i < prices.size(); ++i) {
            double change = prices[i] - prices[i - 1];
            if (change > 0) {
                avgGain = (avgGain * (period - 1) + change) / period;
                avgLoss = (avgLoss * (period - 1)) / period;
            } else {
                avgGain = (avgGain * (period - 1)) / period;
                avgLoss = (avgLoss * (period - 1) - change) / period;
            }
        }
        if (avgLoss == 0) return 100.0;
        double rs = avgGain / avgLoss;
        return 100.0 - (100.0 / (1.0 + rs));
    }

    static void calculateBollinger(const std::vector<double>& prices, MarketData& data, int period = 20) {
        if (prices.size() < period) return;
        data.sma = calculateSMA(prices, period);
        data.currentPrice = prices.back();
        double varianceSum = 0.0;
        for (size_t i = prices.size() - period; i < prices.size(); ++i) {
            varianceSum += std::pow(prices[i] - data.sma, 2);
        }
        double stdDev = std::sqrt(varianceSum / period);
        data.upperBand = data.sma + (stdDev * 2);
        data.lowerBand = data.sma - (stdDev * 2);
    }

    static std::string generatePromptSegment(const std::vector<double>& prices) {
        if (prices.size() < 20) return "Insufficient data.";
        MarketData data;
        data.rsi = calculateRSI(prices);
        calculateBollinger(prices, data);

        std::stringstream ss;
        ss << std::fixed << std::setprecision(2);
        ss << "TECHNICAL INDICATORS (Calculated by C++):\n";
        ss << "- Current Price: $" << data.currentPrice << "\n";
        ss << "- SMA (20-day Trend): $" << data.sma << " (Price is " << (data.currentPrice > data.sma ? "Above" : "Below") << " avg)\n";
        ss << "- RSI (Momentum): " << data.rsi << " (Note: >70 Overbought, <30 Oversold)\n";
        ss << "- Bollinger Bands: Upper[$" << data.upperBand << "] Lower[$" << data.lowerBand << "]\n";
        return ss.str();
    }
};

int main() {
    WSADATA wsaData;
    WSAStartup(MAKEWORD(2, 2), &wsaData);
    SOCKET serverSocket = socket(AF_INET, SOCK_STREAM, 0);
    sockaddr_in serverAddr;
    serverAddr.sin_family = AF_INET;
    serverAddr.sin_addr.s_addr = inet_addr("127.0.0.1");
    serverAddr.sin_port = htons(8080);
    bind(serverSocket, (sockaddr*)&serverAddr, sizeof(serverAddr));
    listen(serverSocket, SOMAXCONN);

    std::cout << "C++ Quantitative Analyst running on port 8080...\n";
    std::cout << "Waiting for Node.js requests...\n";

    while (true) {
        SOCKET clientSocket = accept(serverSocket, NULL, NULL);
        if (clientSocket == INVALID_SOCKET) continue;
        char buffer[4096] = {0};
        recv(clientSocket, buffer, 4096, 0);
        std::string request(buffer);
        size_t bodyPos = request.find("\r\n\r\n");
        if (bodyPos != std::string::npos) {
            try {
                auto j = json::parse(request.substr(bodyPos + 4));
                std::vector<double> prices = j["prices"].get<std::vector<double>>();
                
                std::string techString = StrategyEngine::generatePromptSegment(prices);

                // --- VISUAL VERIFICATION START ---
                std::cout << "\n[VERIFY] Real-time Calculation:" << std::endl;
                std::cout << "--------------------------------" << std::endl;
                std::cout << techString << std::endl;
                std::cout << "--------------------------------" << std::endl;
                // --- VISUAL VERIFICATION END ---

                json responseJson;
                responseJson["technical_analysis"] = techString;
                std::string responseBody = responseJson.dump();
                std::string httpResponse = "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: " + std::to_string(responseBody.length()) + "\r\n\r\n" + responseBody;
                send(clientSocket, httpResponse.c_str(), httpResponse.length(), 0);
            } catch (...) {
                std::string err = "HTTP/1.1 400 Bad Request\r\n\r\nError";
                send(clientSocket, err.c_str(), err.length(), 0);
            }
        }
        closesocket(clientSocket);
    }
    WSACleanup();
    return 0;
}