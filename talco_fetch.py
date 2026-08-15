import yfinance as yf

df = yf.download("4143.SR", period="4y", interval="1d", auto_adjust=False)
df.to_csv("talco_history.csv")
print(df.tail())
print("عدد الايام:", len(df))