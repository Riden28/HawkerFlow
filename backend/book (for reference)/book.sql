-- phpMyAdmin SQL Dump
-- version 4.7.4
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1:3306
-- Generation Time: Jan 14, 2019 at 06:42 AM
-- Server version: 5.7.19
-- PHP Version: 7.1.9

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET AUTOCOMMIT = 0;
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `book`
--
CREATE DATABASE IF NOT EXISTS `book` DEFAULT CHARACTER SET utf8 COLLATE utf8_general_ci;
USE `book`;

-- --------------------------------------------------------

--
-- Table structure for table `books`
--

DROP TABLE IF EXISTS `book`;
CREATE TABLE IF NOT EXISTS `book` (
  `title` varchar(64) NOT NULL,
  `isbn13` char(13) NOT NULL,
  `price` decimal(10,2) NOT NULL,
  `availability` int(11) DEFAULT NULL,
  PRIMARY KEY (`isbn13`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

--
-- Dumping data for table `book`
--

INSERT INTO `book` (`title`, `isbn13`, `price`, `availability`) VALUES
('SQL in Nutshell', '9781129474251', '21.50', 2),
('Understanding People', '9781349471231', '99.40', 25),
('Happy in Workplace', '9781434474234', '94.00', 1),
('PHP Soup', '9781442374221', '20.50', 2),
('Brief History of Time', '9781449474211', '20.00', 23),
('It', '9781449474212', '1.00', 2),
('Founder of Php', '9781449474221', '34.00', 1),
('Albert Enstein\'s Works', '9781449474223', '18.00', 7),
('Interstellar', '9781449474254', '10.00', 4),
('Milk and Honey', '9781449474256', '25.00', 18),
('Cooking Book', '9781449474323', '99.90', 4),
('The Gathering', '9781449474342', '20.00', 50);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
