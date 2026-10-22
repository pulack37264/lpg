-- Create the LPG delivery schema and sample data for MSSQL.

IF OBJECT_ID('dbo.Orders', 'U') IS NOT NULL DROP TABLE dbo.Orders;
IF OBJECT_ID('dbo.Products', 'U') IS NOT NULL DROP TABLE dbo.Products;
IF OBJECT_ID('dbo.Admins', 'U') IS NOT NULL DROP TABLE dbo.Admins;
IF OBJECT_ID('dbo.Customers', 'U') IS NOT NULL DROP TABLE dbo.Customers;

CREATE TABLE Customers (
  Id INT IDENTITY(1,1) PRIMARY KEY,
  Name NVARCHAR(100) NOT NULL,
  Email NVARCHAR(150) NOT NULL UNIQUE,
  PasswordHash NVARCHAR(200) NOT NULL,
  Address NVARCHAR(200) NULL,
  Phone NVARCHAR(50) NULL,
  IsActive BIT NOT NULL DEFAULT 1
);

CREATE TABLE Admins (
  Id INT IDENTITY(1,1) PRIMARY KEY,
  Name NVARCHAR(100) NOT NULL,
  Email NVARCHAR(150) NOT NULL UNIQUE,
  PasswordHash NVARCHAR(200) NOT NULL
);

CREATE TABLE Products (
  Id INT IDENTITY(1,1) PRIMARY KEY,
  Name NVARCHAR(150) NOT NULL,
  Description NVARCHAR(400) NOT NULL,
  Price DECIMAL(10,2) NOT NULL,
  Tag NVARCHAR(100) NOT NULL,
  Stock INT NOT NULL DEFAULT 0
);

CREATE TABLE Orders (
  Id INT IDENTITY(1,1) PRIMARY KEY,
  CustomerId INT NOT NULL REFERENCES Customers(Id),
  Total DECIMAL(10,2) NOT NULL,
  Items NVARCHAR(MAX) NOT NULL,
  ShippingAddress NVARCHAR(200) NULL,
  Phone NVARCHAR(50) NULL,
  Status NVARCHAR(50) NOT NULL DEFAULT 'pending',
  CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);

-- Insert test customer and admin with bcrypt password hashes.
-- Generated with bcryptjs (cost 12).
INSERT INTO Customers (Name, Email, PasswordHash, Address, Phone, IsActive) VALUES
('Test Customer', 'customer@example.com', '$2a$12$EVNwizy7V9dSGQVxN9w6PO7EJyPxB1JTMBZVhZrEy3/MCxY86bW0S', '123 Test St', '0123456789', 1);

INSERT INTO Admins (Name, Email, PasswordHash) VALUES
('Site Admin', 'admin@example.com', '$2a$12$REjNA8UihKjWzZF1sDsl7OJKiDrkKpG94dQjtph3YRgNf/6E6GEiK');

-- Sample products
INSERT INTO Products (Name, Description, Price, Tag, Stock) VALUES
('5kg LPG Cylinder', 'Compact cylinder for small kitchens and portable stoves.', 24.99, 'Best value', 10),
('12kg LPG Cylinder', 'Standard home cylinder with reliable supply for daily cooking.', 49.99, 'Popular', 20),
('24kg LPG Cylinder', 'Large cylinder for families and extended use.', 89.99, 'Family pack', 5),
('Refill Service', 'Schedule a fast home refill and keep your cylinder topped up.', 15.00, 'Quick refill', 100),
('Safety Kit', 'Gas leak detector, regulators, and safe handling guidance.', 29.99, 'Safety first', 15);
